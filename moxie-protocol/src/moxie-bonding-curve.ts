import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula, Initialized, MoxieBondingCurve } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { Order, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectFeeTransfer, Summary, User } from "../generated/schema"

import { handleBondingCurveInitializedTx, handleSubjectSharePurchasedTx, handleSubjectShareSoldTx, handleUpdateBeneficiaryTx, handleUpdateFeesTx, handleUpdateFormulaTx } from "./moxie-bonding-curve-tx"
import { calculateBuySideFee, calculateSellSideFee, createProtocolFeeTransfer, createSubjectFeeTransfer, createUserProtocolOrder, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateUser, getTxEntityId, handleNewBeneficiary, loadProtocolOrder, loadSummary, savePortfolio, saveSubjectToken, saveUser } from "./utils"
import { ORDER_TYPE_BUY as BUY, AUCTION_ORDER_CANCELLED as CANCELLED, AUCTION_ORDER_NA as NA, AUCTION_ORDER_PLACED as PLACED, ORDER_TYPE_SELL as SELL, SUMMARY_ID } from "./constants"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  handleBondingCurveInitializedTx(event)
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
  subjectToken.reserveRatio = event.params._reserveRatio
  subjectToken.initialSupply = event.params._initialSupply
  saveSubjectToken(subjectToken, event.block)
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

  handleSubjectSharePurchasedTx(event)
  const blockInfo = getOrCreateBlockInfo(event.block)
  let price = event.params._sellAmount.divDecimal(new BigDecimal(event.params._buyAmount))
  let user = getOrCreateUser(event.params._beneficiary, event.block)
  let subjectToken = getOrCreateSubjectToken(event.params._buyToken, event.block)
  subjectToken.protocolTokenSpent = subjectToken.protocolTokenSpent.plus(event.params._sellAmount)
  subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceinWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.volume = subjectToken.volume.plus(event.params._sellAmount)
  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._sellToken
  order.protocolTokenAmount = event.params._sellAmount
  order.protocolTokenInvested = new BigDecimal(event.params._sellAmount)
  order.subjectToken = subjectToken.id
  order.subjectAmount = event.params._buyAmount
  order.subjectAmountLeft = event.params._buyAmount
  order.orderType = BUY
  order.user = user.id
  order.price = price
  order.auctionOrderStatus = NA
  order.blockInfo = blockInfo.id

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.params._beneficiary, event.params._buyToken, event.transaction.hash, event.block)
  portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params._sellAmount)
  portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  savePortfolio(portfolio, event.block)

  order.portfolio = portfolio.id
  order.userProtocolOrderIndex = user.protocolOrdersCount
  order.save()

  createUserProtocolOrder(user, order, event.block)

  // increasing user protocol token spent
  user.protocolTokenSpent = user.protocolTokenSpent.plus(event.params._sellAmount)
  // increasing user investment
  user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  saveUser(user, event.block)

  const summary = loadSummary()
  summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(event.params._sellAmount))
  summary.save()

  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  const txHash = event.transaction.hash.toHexString()
  const fees = calculateBuySideFee(event.params._sellAmount)

  createSubjectFeeTransfer(event, blockInfo, order, subjectToken, subjectToken.beneficiary, fees.subjectFee)

  createProtocolFeeTransfer(event, blockInfo, order, subjectToken, activeFeeBeneficiary, fees.protocolFee)

  subjectToken.beneficiaryFee = subjectToken.beneficiaryFee.plus(fees.subjectFee)
  subjectToken.protocolFee = subjectToken.protocolFee.plus(fees.protocolFee)
  saveSubjectToken(subjectToken, event.block)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()

  log.warning("loading beneficiaryUser ", [])

  let beneficiary = subjectToken.beneficiary
  if (beneficiary) {
    log.warning("beneficiaryUser {}", [beneficiary])
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      log.warning("beneficiaryUser loaded {}", [beneficiaryUser.id])
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)
      log.warning("beneficiaryUser pushResponse {}", [pushResponse.toString()])
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
  handleSubjectShareSoldTx(event)
  const blockInfo = getOrCreateBlockInfo(event.block)
  let price = event.params._sellAmount.divDecimal(new BigDecimal(event.params._buyAmount))
  let subjectToken = getOrCreateSubjectToken(event.params._sellToken, event.block)
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceinWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.volume = subjectToken.volume.plus(event.params._buyAmount)
  if (event.transaction.from != event.params._beneficiary) {
    log.warning("event.transaction.from {}, event.params._beneficiary {} ", [event.transaction.from.toHexString(), event.params._beneficiary.toHexString()])
    throw new Error("beneficiary should be the same as the transaction sender")
  }
  let user = getOrCreateUser(event.params._beneficiary, event.block)

  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._buyToken
  order.protocolTokenAmount = event.params._buyAmount
  order.subjectToken = subjectToken.id
  order.subjectAmount = event.params._sellAmount
  order.subjectAmountLeft = BigInt.zero()
  order.protocolTokenInvested = new BigDecimal(BigInt.zero())
  order.orderType = SELL
  order.user = user.id
  order.price = price
  order.blockInfo = blockInfo.id
  order.auctionOrderStatus = NA
  order.userProtocolOrderIndex = BigInt.fromI32(0)

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.transaction.from, event.params._sellToken, event.transaction.hash, event.block)

  order.portfolio = portfolio.id
  order.save()

  const summary = loadSummary()
  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  let txHash = event.transaction.hash.toHexString()
  const fees = calculateSellSideFee(event.params._sellAmount)

  createSubjectFeeTransfer(event, blockInfo, order, subjectToken, subjectToken.beneficiary, fees.subjectFee)

  // decreasing protocol token spent
  user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params._buyAmount)
  let subjectTokenRemaining = event.params._sellAmount
  log.debug("incoming sell order id: {} initial subjectTokenRemaining {}", [order.id, subjectTokenRemaining.toString()])
  for (let i = BigInt.fromI32(1); i.le(user.protocolOrdersCount); i = i.plus(BigInt.fromI32(1))) {
    let protocolOrder = loadProtocolOrder(user, i)
    if (protocolOrder.subjectToken != subjectToken.id || protocolOrder.auctionOrderStatus == CANCELLED || protocolOrder.auctionOrderStatus == PLACED) {
      log.debug("incoming sell order id: {},skipping protocolOrder id: {} protocolOrder.subjectToken {} order.subject {} protocolOrder.auctionOrderStatus {}", [order.id, protocolOrder.id, protocolOrder.subjectToken, subjectToken.id, protocolOrder.auctionOrderStatus])
      // should reduce subjectAmountLeft only if subjectToken is matching
      // skipping cancelled orders
      continue
    }
    if (subjectTokenRemaining.gt(protocolOrder.subjectAmountLeft)) {
      log.debug("incoming sell order id: {} subjectTokenRemaining {} > protocolOrder.subjectAmountLeft {} protocolOrder {} ", [order.id, subjectTokenRemaining.toString(), protocolOrder.subjectAmountLeft.toString(), protocolOrder.id])
      subjectTokenRemaining = subjectTokenRemaining.minus(protocolOrder.subjectAmountLeft)
      log.debug("incoming sell order id: {} new subjectTokenRemaining {} protocolOrder {} ", [order.id, subjectTokenRemaining.toString(), protocolOrder.id])
      protocolOrder.subjectAmountLeft = BigInt.fromI32(0)
    } else {
      log.debug("incoming sell order id: {} subjectTokenRemaining {} < protocolOrder.subjectAmountLeft {} protocolOrder {} ", [order.id, subjectTokenRemaining.toString(), protocolOrder.subjectAmountLeft.toString(), protocolOrder.id])
      protocolOrder.subjectAmountLeft = protocolOrder.subjectAmountLeft.minus(subjectTokenRemaining)
      log.debug("incoming sell order id: {} new protocolOrder.subjectAmountLeft {} protocolOrder {} ", [order.id, protocolOrder.subjectAmountLeft.toString(), protocolOrder.id])
      subjectTokenRemaining = BigInt.fromI32(0)
    }
    if (protocolOrder.subjectAmount == BigInt.zero()) {
      protocolOrder.protocolTokenInvested = new BigDecimal(BigInt.zero())
    } else {
      protocolOrder.protocolTokenInvested = protocolOrder.subjectAmountLeft.times(protocolOrder.protocolTokenAmount).divDecimal(new BigDecimal(protocolOrder.subjectAmount))
    }
    protocolOrder.save()
    user.protocolTokenInvested = user.protocolTokenInvested.minus(new BigDecimal(protocolOrder.protocolTokenAmount)).plus(protocolOrder.protocolTokenInvested)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.minus(new BigDecimal(protocolOrder.protocolTokenAmount)).plus(protocolOrder.protocolTokenInvested)
    subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.minus(new BigDecimal(protocolOrder.protocolTokenAmount)).plus(protocolOrder.protocolTokenInvested)
    summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.minus(new BigDecimal(protocolOrder.protocolTokenAmount)).plus(protocolOrder.protocolTokenInvested)
  }
  summary.save()
  saveUser(user, event.block)
  savePortfolio(portfolio, event.block)
  saveSubjectToken(subjectToken, event.block)
  createProtocolFeeTransfer(event, blockInfo, order, subjectToken, activeFeeBeneficiary, fees.protocolFee)

  subjectToken.beneficiaryFee = subjectToken.beneficiaryFee.plus(fees.subjectFee)
  subjectToken.protocolFee = subjectToken.protocolFee.plus(fees.protocolFee)
  saveSubjectToken(subjectToken, event.block)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()
  log.warning("loading beneficiaryUser ", [])

  let beneficiary = subjectToken.beneficiary
  if (beneficiary) {
    log.warning("beneficiaryUser {}", [beneficiary])
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      log.warning("beneficiaryUser loaded {}", [beneficiaryUser.id])
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)
      log.warning("beneficiaryUser pushResponse {}", [pushResponse.toString()])
      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      saveUser(beneficiaryUser, event.block)
    }
  }
}

export function handleUpdateBeneficiary(event: UpdateBeneficiary): void {
  handleUpdateBeneficiaryTx(event)
  handleNewBeneficiary(event.params._beneficiary)
}

export function handleUpdateFees(event: UpdateFees): void {
  handleUpdateFeesTx(event)
  let summary = loadSummary()
  summary.protocolBuyFeePct = event.params._protocolBuyFeePct
  summary.protocolSellFeePct = event.params._protocolSellFeePct
  summary.subjectBuyFeePct = event.params._subjectBuyFeePct
  summary.subjectSellFeePct = event.params._subjectSellFeePct
}

export function handleUpdateFormula(event: UpdateFormula): void {
  handleUpdateFormulaTx(event)
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

  let summary = new Summary(SUMMARY_ID)
  summary.activeProtocolFeeBeneficiary = beneficiary.id
  summary.protocolBuyFeePct = protocolBuyFeePct
  summary.protocolSellFeePct = protocolSellFeePct
  summary.subjectBuyFeePct = subjectBuyFeePct
  summary.subjectSellFeePct = subjectSellFeePct

  summary.totalReserve = BigInt.fromI32(0)
  summary.totalTokensIssued = BigInt.fromI32(0)
  summary.totalProtocolTokenInvested = new BigDecimal(BigInt.fromI32(0))
  summary.save()
}
