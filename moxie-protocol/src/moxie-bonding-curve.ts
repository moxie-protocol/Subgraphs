import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula, Initialized, MoxieBondingCurve } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { Order, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectFeeTransfer, Summary, User } from "../generated/schema"

import { calculateBuySideFee, calculateSellSideFee, createProtocolFeeTransfer, createSubjectFeeTransfer, createUserProtocolOrder, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateUser, getTxEntityId, handleNewBeneficiary, loadProtocolOrder, getOrCreateSummary, savePortfolio, saveSubjectToken, saveUser, saveSubjectTokenAndSnapshots } from "./utils"
import { ORDER_TYPE_BUY as BUY, AUCTION_ORDER_CANCELLED as CANCELLED, AUCTION_ORDER_NA as NA, AUCTION_ORDER_PLACED as PLACED, ORDER_TYPE_SELL as SELL, SUMMARY_ID } from "./constants"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, null, event.block)
  subjectToken.reserveRatio = event.params._reserveRatio
  subjectToken.initialSupply = event.params._initialSupply // initial supply of subject token
  // price during initialization = reserve (moxie) / initial supply (subject token)
  let price = event.params._reserve.divDecimal(new BigDecimal(event.params._initialSupply))
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  saveSubjectTokenAndSnapshots(subjectToken, event.block)
}

export function handleSubjectSharePurchased(event: SubjectSharePurchased): void {
  // BUY - BUY fan tokens
  // mint subjectToken of shares_ to _onBehalfOf
  // msg.sender Transfer deposit amount (MOXIE) from subject to bonding curve

  // 1. transfer deposit amount (MOXIE) from subject to bonding curve
  // 2. transfers subject fee (in MOXIE) to subject beneficiary (_subject)
  // 3. transfers protocol fee (in MOXIE) to protocol beneficiary
  // 4. deposit rest of amount to vault
  // 5. mint shares (subjectToken) to _onBehalfOf
  //   event SubjectSharePurchased(
  //     address _subject,
  //     address _sellToken : address(MOXIE),
  //     uint256 _sellAmount : _depositAmount,
  //     address _buyToken : address(_subjectToken),
  //     uint256 _buyAmount : shares_,
  //     address _beneficiary : _onBehalfOf
  // );

  //  if msg.sender == _beneficiary
  //  user will be msg.sender
  //  user.portfolio.balance += _buyAmount
  //  user.portfolio.protocolTokenInvested += _sellAmount

  // if msg.sender != _beneficiary
  // msg.sender .portfolio.protocolTokenInvested += _sellAmount
  // msg.sender .portfolio.balance += 0

  // _beneficiary.portfolio.balance += _buyAmount
  // _beneficiary.portfolio.protocolTokenInvested += 0

  const fees = calculateBuySideFee(event.params._sellAmount)
  let protocolTokenSpentAfterFees = event.params._sellAmount.minus(fees.protocolFee).minus(fees.subjectFee)

  const blockInfo = getOrCreateBlockInfo(event.block)
  // calculating price here the sell amount will be in protocol token and buy amount is protocol token since it's a buy
  let price = protocolTokenSpentAfterFees.divDecimal(new BigDecimal(event.params._buyAmount))
  // TODO: need to fix for spender
  let user = getOrCreateUser(event.params._beneficiary, event.block)
  let subjectToken = getOrCreateSubjectToken(event.params._buyToken, null, event.block)
  subjectToken.buySideVolume = subjectToken.buySideVolume.plus(event.params._sellAmount)
  subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(event.params._sellAmount)
  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._sellToken
  order.protocolTokenAmount = event.params._sellAmount
  order.protocolTokenInvested = new BigDecimal(event.params._sellAmount)
  order.subjectToken = subjectToken.id
  order.subjectAmount = event.params._buyAmount
  order.orderType = BUY
  order.user = user.id
  order.subjectFee = fees.subjectFee
  order.protocolFee = fees.protocolFee
  order.price = price
  order.auctionOrderStatus = NA
  order.blockInfo = blockInfo.id

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.params._beneficiary, event.params._buyToken, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(event.params._sellAmount)
  portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(event.params._buyAmount)

  savePortfolio(portfolio, event.block)

  order.portfolio = portfolio.id
  order.userProtocolOrderIndex = user.protocolOrdersCount
  order.save()

  createUserProtocolOrder(user, order, event.block)

  // increasing user protocol token spent
  user.buyVolume = user.buyVolume.plus(event.params._sellAmount)
  // increasing user investment
  user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  saveUser(user, event.block)

  const summary = getOrCreateSummary()
  summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  summary.numberOfBuyOrders = summary.numberOfBuyOrders.plus(BigInt.fromI32(1))
  summary.totalBuyVolume = summary.totalBuyVolume.plus(event.params._sellAmount)
  if (!summary.activeProtocolFeeBeneficiary) {
    throw new Error("activeProtocolFeeBeneficiary not found")
  }
  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary!)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  const txHash = event.transaction.hash.toHexString()
  summary.totalProtocolFee = summary.totalProtocolFee.plus(fees.protocolFee)
  summary.totalSubjectFee = summary.totalSubjectFee.plus(fees.subjectFee)
  summary.save()

  createSubjectFeeTransfer(event, blockInfo, order, subjectToken, fees.subjectFee)

  createProtocolFeeTransfer(event, blockInfo, order, subjectToken, activeFeeBeneficiary, fees.protocolFee)

  subjectToken.subjectFee = subjectToken.subjectFee.plus(fees.subjectFee)
  subjectToken.protocolFee = subjectToken.protocolFee.plus(fees.protocolFee)
  saveSubjectTokenAndSnapshots(subjectToken, event.block)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()

  let beneficiary = subjectToken.subject
  if (beneficiary) {
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)
      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      saveUser(beneficiaryUser, event.block)
    }
  }
}

export function handleSubjectShareSold(event: SubjectShareSold): void {
  // SELL - SELL fan tokens to bonding curve
  // 1. transfer _sellAmount shares (subjectToken) from _subject to bonding curve
  // 2. burns shares (subjectToken) of amount _sellAmount
  // 3. transfers returnAmountWithoutFee (MOXIE) from vault to bonding curve
  // 4. transfer subjectFee (MOXIE) to subject beneficiary
  // 5. transfer protocolfee (MOXIE) to feeBeneficiary
  // 6. transfer returnedAmount_ (MOXIE) to _onBehalfOf
  //   event SubjectShareSold(
  //     address _subject,
  //     address _sellToken,: address(_subjectToken),
  //     uint256 _sellAmount,: _sellAmount,
  //     address _buyToken,: address(token),
  //     uint256 _buyAmount,:returnedAmount_,
  //     address _beneficiary:_onBehalfOf
  // );

  //  if msg.sender == _beneficiary
  //  msg.sender.portfolio.balance -= _sellAmount
  //  msg.sender.protocolTokenInvested -= _buyAmount (by ratio we are reducing)

  // if msg.sender != _beneficiary
  // msg.sender .portfolio.balance -= _sellAmount
  // msg.sender .portfolio.protocolTokenInvested -= _buyAmount (by ratio we are reducing)

  // _beneficiary.portfolio.balance -= 0
  // _beneficiary.portfolio.protocolTokenInvested += 0

  const fees = calculateSellSideFee(event.params._buyAmount)
  let protocolTokenSpentAfterFees = event.params._buyAmount.minus(fees.protocolFee).minus(fees.subjectFee)

  const blockInfo = getOrCreateBlockInfo(event.block)
  // calculating price here the sell amount will be subject token and buy amount is protocol token since it's a sell
  let price = protocolTokenSpentAfterFees.divDecimal(new BigDecimal(event.params._sellAmount))
  let subjectToken = getOrCreateSubjectToken(event.params._sellToken, null, event.block)
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(event.params._buyAmount)
  if (event.transaction.from != event.params._beneficiary) {
    // throw new Error("beneficiary should be the same as the transaction sender")
  }
  let user = getOrCreateUser(event.params._beneficiary, event.block)

  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._buyToken
  order.protocolTokenAmount = event.params._buyAmount
  order.subjectToken = subjectToken.id
  order.subjectAmount = event.params._sellAmount
  order.protocolTokenInvested = new BigDecimal(BigInt.zero())
  order.orderType = SELL
  order.user = user.id
  order.price = price
  order.subjectFee = fees.subjectFee
  order.protocolFee = fees.protocolFee
  order.blockInfo = blockInfo.id
  order.auctionOrderStatus = NA
  order.userProtocolOrderIndex = BigInt.fromI32(0)

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.transaction.from, event.params._sellToken, event.transaction.hash, event.block)
  portfolio.sellVolume = portfolio.sellVolume.plus(event.params._buyAmount)

  // this balance is only for temporary use, actual balance will be updated during Transfer event in subject token
  let updatedBalance = portfolio.balance.minus(event.params._sellAmount)
  // buyVolume / subjectTokenBuyVolume = protocolTokenInvested / balance
  if (portfolio.subjectTokenBuyVolume.gt(BigInt.zero())) {
    portfolio.protocolTokenInvested = new BigDecimal(portfolio.buyVolume).times(new BigDecimal(updatedBalance)).div(new BigDecimal(portfolio.subjectTokenBuyVolume))
  }
  order.portfolio = portfolio.id
  order.save()

  const summary = getOrCreateSummary()
  if (!summary.activeProtocolFeeBeneficiary) {
    throw new Error("activeProtocolFeeBeneficiary not found")
  }
  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary!)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  let txHash = event.transaction.hash.toHexString()

  createSubjectFeeTransfer(event, blockInfo, order, subjectToken, fees.subjectFee)

  // increasing user protocol token earned
  user.sellVolume = user.sellVolume.plus(event.params._buyAmount)
  summary.numberOfSellOrders = summary.numberOfSellOrders.plus(BigInt.fromI32(1))
  summary.totalSellVolume = summary.totalSellVolume.plus(event.params._buyAmount)
  summary.totalProtocolFee = summary.totalProtocolFee.plus(fees.protocolFee)
  summary.totalSubjectFee = summary.totalSubjectFee.plus(fees.subjectFee)
  summary.save()
  saveUser(user, event.block)
  savePortfolio(portfolio, event.block)
  createProtocolFeeTransfer(event, blockInfo, order, subjectToken, activeFeeBeneficiary, fees.protocolFee)

  subjectToken.subjectFee = subjectToken.subjectFee.plus(fees.subjectFee)
  subjectToken.protocolFee = subjectToken.protocolFee.plus(fees.protocolFee)
  subjectToken.sellSideVolume = subjectToken.sellSideVolume.plus(event.params._buyAmount)
  saveSubjectTokenAndSnapshots(subjectToken, event.block)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()

  let beneficiary = subjectToken.subject
  if (beneficiary) {
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)

      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      saveUser(beneficiaryUser, event.block)
    }
  }
}

export function handleUpdateBeneficiary(event: UpdateBeneficiary): void {
  handleNewBeneficiary(event.params._beneficiary)
}

export function handleUpdateFees(event: UpdateFees): void {
  let summary = getOrCreateSummary()
  summary.protocolBuyFeePct = event.params._protocolBuyFeePct
  summary.protocolSellFeePct = event.params._protocolSellFeePct
  summary.subjectBuyFeePct = event.params._subjectBuyFeePct
  summary.subjectSellFeePct = event.params._subjectSellFeePct
  summary.save()
}

export function handleInitialized(event: Initialized): void {
  let bondingCurve = MoxieBondingCurve.bind(event.address)
  let feeBeneficiary = bondingCurve.feeBeneficiary()
  let protocolBuyFeePct = bondingCurve.protocolBuyFeePct()
  let protocolSellFeePct = bondingCurve.protocolSellFeePct()
  let subjectBuyFeePct = bondingCurve.subjectBuyFeePct()
  let subjectSellFeePct = bondingCurve.subjectSellFeePct()

  let beneficiary = new ProtocolFeeBeneficiary(feeBeneficiary.toHexString())
  beneficiary.beneficiary = feeBeneficiary
  beneficiary.totalFees = BigInt.fromI32(0)
  beneficiary.save()

  let summary = getOrCreateSummary()
  summary.activeProtocolFeeBeneficiary = beneficiary.id
  summary.protocolBuyFeePct = protocolBuyFeePct
  summary.protocolSellFeePct = protocolSellFeePct
  summary.subjectBuyFeePct = subjectBuyFeePct
  summary.subjectSellFeePct = subjectSellFeePct

  summary.save()
}
