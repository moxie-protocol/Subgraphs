import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula, Initialized, MoxieBondingCurve } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { Order, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectFeeTransfer, Summary, User } from "../generated/schema"

import { handleBondingCurveInitializedTx, handleSubjectSharePurchasedTx, handleSubjectShareSoldTx, handleUpdateBeneficiaryTx, handleUpdateFeesTx, handleUpdateFormulaTx } from "./moxie-bonding-curve-tx"
import { calculateBuySideFee, calculateSellSideFee, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubject, getOrCreateUser, getTxEntityId, handleNewBeneficiary, loadSummary, saveSubject } from "./utils"
import { SUMMARY_ID } from "./constants"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  handleBondingCurveInitializedTx(event)
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

  handleSubjectSharePurchasedTx(event)

  let price = event.params._buyAmount.divDecimal(new BigDecimal(event.params._sellAmount))
  let user = getOrCreateUser(event.params._beneficiary)

  let subject = getOrCreateSubject(event.params._buyToken)
  subject.currentPrice = price
  subject.volume = subject.volume.plus(event.params._sellAmount)
  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._sellToken
  order.protocolTokenAmount = event.params._sellAmount
  order.subjectToken = subject.id
  order.subjectAmount = event.params._buyAmount
  order.orderType = "BUY"
  order.user = user.id
  order.price = price

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.params._beneficiary, event.params._buyToken, event.transaction.hash)
  // portfolio.balance = portfolio.balance.plus(event.params._buyAmount)
  portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params._sellAmount)
  portfolio.save()

  order.portfolio = portfolio.id
  order.save()
  // updating user's orders
  let orders = user.buyOrders
  orders.push(order.id)
  user.buyOrders = orders
  user.save()

  const blockInfo = getOrCreateBlockInfo(event)
  const summary = loadSummary()
  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  const txHash = event.transaction.hash.toHexString()
  const fees = calculateBuySideFee(event.params._sellAmount)
  let subjectFeeTransfer = new SubjectFeeTransfer(txHash)
  subjectFeeTransfer.txHash = event.transaction.hash
  subjectFeeTransfer.blockInfo = blockInfo.id
  subjectFeeTransfer.subject = subject.id
  subjectFeeTransfer.beneficiary = subject.beneficiary
  subjectFeeTransfer.amount = fees.subjectFee
  subjectFeeTransfer.order = order.id
  subjectFeeTransfer.save()

  let protocolFeeTransfer = new ProtocolFeeTransfer(getTxEntityId(event))
  protocolFeeTransfer.txHash = event.transaction.hash
  protocolFeeTransfer.blockInfo = blockInfo.id
  protocolFeeTransfer.order = order.id
  protocolFeeTransfer.subject = subject.id
  protocolFeeTransfer.beneficiary = activeFeeBeneficiary.id
  protocolFeeTransfer.amount = fees.protocolFee
  protocolFeeTransfer.save()

  subject.beneficiaryFee = subject.beneficiaryFee.plus(fees.subjectFee)
  subject.protcolFee = subject.protcolFee.plus(fees.protocolFee)
  saveSubject(subject, event.block.timestamp)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()

  log.warning("loading beneficiaryUser ", [])

  let beneficiary = subject.beneficiary
  if (beneficiary) {
    log.warning("beneficiaryUser {}", [beneficiary])
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      log.warning("beneficiaryUser loaded {}", [beneficiaryUser.id])
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)
      log.warning("beneficiaryUser pushResponse {}", [pushResponse.toString()])
      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      beneficiaryUser.save()
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
  handleSubjectShareSoldTx(event)
  let price = event.params._sellAmount.divDecimal(new BigDecimal(event.params._buyAmount))
  let subject = getOrCreateSubject(event.params._sellToken)
  subject.currentPrice = price
  subject.volume = subject.volume.plus(event.params._buyAmount)
  saveSubject(subject, event.block.timestamp)

  let user = getOrCreateUser(event.transaction.from)

  // Saving order entity
  let order = new Order(getTxEntityId(event))
  order.protocolToken = event.params._buyToken
  order.protocolTokenAmount = event.params._buyAmount
  order.subjectToken = subject.id
  order.subjectAmount = event.params._sellAmount
  order.orderType = "SELL"
  order.user = user.id
  order.price = price

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.transaction.from, event.params._sellToken, event.transaction.hash)
  // portfolio.balance = portfolio.balance.minus(event.params._sellAmount)
  portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params._buyAmount)
  portfolio.save()

  order.portfolio = portfolio.id
  order.save()

  const blockInfo = getOrCreateBlockInfo(event)
  const summary = loadSummary()
  let activeFeeBeneficiary = ProtocolFeeBeneficiary.load(summary.activeProtocolFeeBeneficiary)
  if (!activeFeeBeneficiary) {
    throw new Error("protocol beneficiary not found")
  }
  let txHash = event.transaction.hash.toHexString()
  const fees = calculateSellSideFee(event.params._sellAmount)
  let subjectFeeTransfer = new SubjectFeeTransfer(txHash)
  subjectFeeTransfer.txHash = event.transaction.hash
  subjectFeeTransfer.blockInfo = blockInfo.id
  subjectFeeTransfer.subject = subject.id
  subjectFeeTransfer.beneficiary = subject.beneficiary
  subjectFeeTransfer.amount = fees.subjectFee
  subjectFeeTransfer.order = order.id
  subjectFeeTransfer.save()

  // updating user's orders
  let orders = user.sellOrders
  orders.push(order.id)
  user.sellOrders = orders
  user.save()

  let protocolFeeTransfer = new ProtocolFeeTransfer(getTxEntityId(event))
  protocolFeeTransfer.txHash = event.transaction.hash
  protocolFeeTransfer.blockInfo = blockInfo.id
  protocolFeeTransfer.order = order.id
  protocolFeeTransfer.subject = subject.id
  protocolFeeTransfer.beneficiary = activeFeeBeneficiary.id
  protocolFeeTransfer.amount = fees.protocolFee
  protocolFeeTransfer.save()

  subject.beneficiaryFee = subject.beneficiaryFee.plus(fees.subjectFee)
  subject.protcolFee = subject.protcolFee.plus(fees.protocolFee)
  saveSubject(subject, event.block.timestamp)

  activeFeeBeneficiary.totalFees = activeFeeBeneficiary.totalFees.plus(fees.protocolFee)
  activeFeeBeneficiary.save()
  log.warning("loading beneficiaryUser ", [])

  let beneficiary = subject.beneficiary
  if (beneficiary) {
    log.warning("beneficiaryUser {}", [beneficiary])
    let beneficiaryUser = User.load(beneficiary)
    if (beneficiaryUser) {
      log.warning("beneficiaryUser loaded {}", [beneficiaryUser.id])
      let subjectFeeTransfer = beneficiaryUser.subjectFeeTransfer
      let pushResponse = subjectFeeTransfer.push(txHash)
      log.warning("beneficiaryUser pushResponse {}", [pushResponse.toString()])
      beneficiaryUser.subjectFeeTransfer = subjectFeeTransfer
      beneficiaryUser.save()
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
  summary.save()
}
