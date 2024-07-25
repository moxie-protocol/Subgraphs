import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula, Initialized, MoxieBondingCurve } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { Order, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectFeeTransfer, Summary, User } from "../generated/schema"

import { calculateBuySideFee, calculateSellSideFee, createProtocolFeeTransfer, createSubjectFeeTransfer, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateUser, getTxEntityId, handleNewBeneficiary, getOrCreateSummary, savePortfolio, saveSubjectToken, saveUser, CalculatePrice, calculateSellSideProtocolAmountAddingBackFees } from "./utils"
import { ORDER_TYPE_BUY as BUY, AUCTION_ORDER_CANCELLED as CANCELLED, AUCTION_ORDER_NA as NA, AUCTION_ORDER_PLACED as PLACED, ORDER_TYPE_SELL as SELL, SUMMARY_ID } from "./constants"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, null, event.block)
  subjectToken.reserveRatio = event.params._reserveRatio
  subjectToken.initialSupply = event.params._initialSupply // initial supply of subject token
  let calculatedPrice = new CalculatePrice(event.params._reserve, event.params._initialSupply)
  subjectToken.currentPriceInMoxie = calculatedPrice.price
  subjectToken.currentPriceInWeiInMoxie = calculatedPrice.priceInWei
  saveSubjectToken(subjectToken, event.block, true)
}

export function handleSubjectSharePurchased(event: SubjectSharePurchased): void {
  // _spender transfers _sellAmount to bonding curve
  // _beneficiary mints _buyAmount of subject token
  let spender = event.params._spender
  let spenderUser = getOrCreateUser(spender, event.block)
  let beneficiary = event.params._beneficiary
  let beneficiaryUser = getOrCreateUser(beneficiary, event.block)
  let protocolTokenAmount = event.params._sellAmount
  let subjectToken = event.params._buyToken

  const fees = calculateBuySideFee(protocolTokenAmount)
  let protocolTokenSpentAfterFees = protocolTokenAmount.minus(fees.protocolFee).minus(fees.subjectFee)

  const blockInfo = getOrCreateBlockInfo(event.block)
  // calculating price here the sell amount will be in protocol token and buy amount is protocol token since it's a buy
  let calculatedPrice = new CalculatePrice(protocolTokenSpentAfterFees, event.params._buyAmount)
  // TODO: need to fix for spender
  let subjectTokenEntity = getOrCreateSubjectToken(subjectToken, null, event.block)
  subjectTokenEntity.buySideVolume = subjectTokenEntity.buySideVolume.plus(protocolTokenAmount)
  subjectTokenEntity.protocolTokenInvested = subjectTokenEntity.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  subjectTokenEntity.currentPriceInMoxie = calculatedPrice.price
  subjectTokenEntity.currentPriceInWeiInMoxie = calculatedPrice.priceInWei
  subjectTokenEntity.lifetimeVolume = subjectTokenEntity.lifetimeVolume.plus(protocolTokenAmount)
  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._sellToken
  order.protocolTokenAmount = protocolTokenAmount
  order.protocolTokenInvested = new BigDecimal(protocolTokenAmount)
  order.subjectToken = subjectTokenEntity.id
  order.subjectAmount = event.params._buyAmount
  order.orderType = BUY
  order.spender = spenderUser.id
  order.beneficiary = beneficiaryUser.id
  order.subjectFee = fees.subjectFee
  order.protocolFee = fees.protocolFee
  order.price = calculatedPrice.price

  order.blockInfo = blockInfo.id

  // updating spender's portfolio
  let spenderPortfolio = getOrCreatePortfolio(spender, subjectToken, event.transaction.hash, event.block)
  spenderPortfolio.buyVolume = spenderPortfolio.buyVolume.plus(protocolTokenAmount)
  spenderPortfolio.protocolTokenInvested = spenderPortfolio.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  spenderPortfolio.subjectTokenBuyVolume = spenderPortfolio.subjectTokenBuyVolume.plus(event.params._buyAmount)

  savePortfolio(spenderPortfolio, event.block)

  order.spenderPortfolio = spenderPortfolio.id
  order.beneficiaryPortfolio = getOrCreatePortfolio(beneficiary, subjectToken, event.transaction.hash, event.block).id
  order.save()

  // increasing spenderUser protocol token spent
  spenderUser.buyVolume = spenderUser.buyVolume.plus(protocolTokenAmount)
  // increasing user investment
  spenderUser.protocolTokenInvested = spenderUser.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  saveUser(spenderUser, event.block)

  const summary = getOrCreateSummary()
  summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  summary.numberOfBuyOrders = summary.numberOfBuyOrders.plus(BigInt.fromI32(1))
  summary.totalBuyVolume = summary.totalBuyVolume.plus(protocolTokenAmount)
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

  createSubjectFeeTransfer(event, blockInfo, order, subjectTokenEntity, fees.subjectFee)

  createProtocolFeeTransfer(event, blockInfo, order, subjectTokenEntity, activeFeeBeneficiary, fees.protocolFee)

  subjectTokenEntity.subjectFee = subjectTokenEntity.subjectFee.plus(fees.subjectFee)
  subjectTokenEntity.protocolFee = subjectTokenEntity.protocolFee.plus(fees.protocolFee)
  saveSubjectToken(subjectTokenEntity, event.block, true)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()

  if (subjectTokenEntity.subject) {
    let beneficiaryUser = User.load(subjectTokenEntity.subject!)
    if (beneficiaryUser) {
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      subjectFeeTransfer.push(txHash)
      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      saveUser(beneficiaryUser, event.block)
    }
  }
}

export function handleSubjectShareSold(event: SubjectShareSold): void {
  // SELL - SELL fan tokens to bonding curve
  // _spender burns subjectAmount
  // _beneficiary gets protocolTokenAmount

  let beneficiary = event.params._beneficiary
  let beneficiaryUser = getOrCreateUser(beneficiary, event.block)
  let spender = event.params._spender
  let spenderUser = getOrCreateUser(spender, event.block)
  let protocolTokenAmountReducingFees = event.params._buyAmount
  let protocolTokenAmount = calculateSellSideProtocolAmountAddingBackFees(protocolTokenAmountReducingFees)
  let subjectAmount = event.params._sellAmount
  let subjectToken = event.params._sellToken

  const fees = calculateSellSideFee(protocolTokenAmount)

  const blockInfo = getOrCreateBlockInfo(event.block)
  // calculating price here the sell amount will be subject token and buy amount is protocol token since it's a sell
  let calculatedPrice = new CalculatePrice(protocolTokenAmountReducingFees, subjectAmount)
  let subjectTokenEntity = getOrCreateSubjectToken(subjectToken, null, event.block)
  subjectTokenEntity.currentPriceInMoxie = calculatedPrice.price
  subjectTokenEntity.currentPriceInWeiInMoxie = calculatedPrice.priceInWei
  subjectTokenEntity.lifetimeVolume = subjectTokenEntity.lifetimeVolume.plus(protocolTokenAmount)
  let price = new CalculatePrice(protocolTokenAmountReducingFees, event.params._sellAmount)
  subjectTokenEntity.currentPriceInMoxie = price.price
  subjectTokenEntity.currentPriceInWeiInMoxie = price.priceInWei
  subjectTokenEntity.lifetimeVolume = subjectTokenEntity.lifetimeVolume.plus(protocolTokenAmount)

  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._buyToken
  order.protocolTokenAmount = protocolTokenAmount
  order.subjectToken = subjectTokenEntity.id
  order.subjectAmount = subjectAmount
  order.protocolTokenInvested = new BigDecimal(BigInt.zero())
  order.orderType = SELL
  order.spender = spenderUser.id
  order.beneficiary = beneficiaryUser.id
  order.price = price.price
  order.subjectFee = fees.subjectFee
  order.protocolFee = fees.protocolFee
  order.blockInfo = blockInfo.id

  // updating user's portfolio
  let spenderPortfolio = getOrCreatePortfolio(spender, subjectToken, event.transaction.hash, event.block)
  spenderPortfolio.sellVolume = spenderPortfolio.sellVolume.plus(protocolTokenAmount)

  let beneficiaryPortfolio = getOrCreatePortfolio(beneficiary, subjectToken, event.transaction.hash, event.block)
  // this balance is only for temporary use, actual balance will be updated during Transfer event in subject token
  let updatedBalance = beneficiaryPortfolio.balance.minus(subjectAmount)
  // buyVolume / subjectTokenBuyVolume = protocolTokenInvested / balance
  if (beneficiaryPortfolio.subjectTokenBuyVolume.gt(BigInt.zero())) {
    beneficiaryPortfolio.protocolTokenInvested = new BigDecimal(beneficiaryPortfolio.buyVolume).times(new BigDecimal(updatedBalance)).div(new BigDecimal(beneficiaryPortfolio.subjectTokenBuyVolume))
  }

  order.spenderPortfolio = spenderPortfolio.id
  order.beneficiaryPortfolio = beneficiaryPortfolio.id
  order.save()

  const summary = getOrCreateSummary()
  if (!summary.activeProtocolFeeBeneficiary) {
    throw new Error("activeProtocolFeeBeneficiary not found")
  }
  let protocolFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary!)
  if (!protocolFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  let txHash = event.transaction.hash.toHexString()

  createSubjectFeeTransfer(event, blockInfo, order, subjectTokenEntity, fees.subjectFee)

  // increasing user protocol token earned
  beneficiaryUser.sellVolume = beneficiaryUser.sellVolume.plus(protocolTokenAmount)
  summary.numberOfSellOrders = summary.numberOfSellOrders.plus(BigInt.fromI32(1))
  summary.totalSellVolume = summary.totalSellVolume.plus(protocolTokenAmount)
  summary.totalProtocolFee = summary.totalProtocolFee.plus(fees.protocolFee)
  summary.totalSubjectFee = summary.totalSubjectFee.plus(fees.subjectFee)
  summary.save()
  saveUser(beneficiaryUser, event.block)
  saveUser(spenderUser, event.block)
  savePortfolio(spenderPortfolio, event.block)
  savePortfolio(beneficiaryPortfolio, event.block)
  createProtocolFeeTransfer(event, blockInfo, order, subjectTokenEntity, protocolFeeBeneficiary, fees.protocolFee)

  subjectTokenEntity.subjectFee = subjectTokenEntity.subjectFee.plus(fees.subjectFee)
  subjectTokenEntity.protocolFee = subjectTokenEntity.protocolFee.plus(fees.protocolFee)
  subjectTokenEntity.sellSideVolume = subjectTokenEntity.sellSideVolume.plus(protocolTokenAmount)
  saveSubjectToken(subjectTokenEntity, event.block, true)

  protocolFeeBeneficiary.totalFees = protocolFeeBeneficiary.totalFees.plus(fees.protocolFee)
  protocolFeeBeneficiary.save()

  let subject = subjectTokenEntity.subject
  if (subject) {
    let subjectUser = User.load(subject)
    if (subjectUser) {
      let subjectFeeTransfer = subjectUser.subjectFeeTransfer
      subjectFeeTransfer.push(txHash)

      subjectUser.subjectFeeTransfer = subjectFeeTransfer
      saveUser(subjectUser, event.block)
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
