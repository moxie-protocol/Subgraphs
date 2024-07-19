import { BigInt } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula } from "../generated/MoxieBondingCurve/MoxieBondingCurve"

import { MoxieBondingCurveBondingCurveInitializedTx, MoxieBondingCurveSubjectSharePurchasedTx, MoxieBondingCurveUpdateBeneficiaryTx, MoxieBondingCurveUpdateFeesTx, MoxieBondingCurveSubjectShareSoldTx, MoxieBondingCurveUpdateFormulaTx } from "../generated/schema"
import { getOrCreateBlockInfo, getOrCreateTransactionId, getTxEntityId } from "./utils"

export function handleBondingCurveInitializedTx(event: BondingCurveInitialized): void {
  let bondingCurve = new MoxieBondingCurveBondingCurveInitializedTx(getTxEntityId(event))
  bondingCurve.blockInfo = getOrCreateBlockInfo(event.block).id
  bondingCurve.txHash = event.transaction.hash
  bondingCurve.subject = event.params._subject
  bondingCurve.subjectToken = event.params._subjectToken
  bondingCurve.initialSupply = event.params._initialSupply
  bondingCurve.reserve = event.params._reserve
  bondingCurve.reserveRatio = event.params._reserveRatio
  bondingCurve.txn = getOrCreateTransactionId(event.transaction.hash)
  bondingCurve.save()
}

export function handleSubjectSharePurchasedTx(event: SubjectSharePurchased): void {
  let subjectSharePurchased = new MoxieBondingCurveSubjectSharePurchasedTx(getTxEntityId(event))
  subjectSharePurchased.blockInfo = getOrCreateBlockInfo(event.block).id
  subjectSharePurchased.txHash = event.transaction.hash
  subjectSharePurchased.subject = event.params._subject
  subjectSharePurchased.sellToken = event.params._sellToken
  subjectSharePurchased.sellAmount = event.params._sellAmount
  subjectSharePurchased.buyToken = event.params._buyToken
  subjectSharePurchased.buyAmount = event.params._buyAmount
  subjectSharePurchased.beneficiary = event.params._beneficiary
  subjectSharePurchased.txn = getOrCreateTransactionId(event.transaction.hash)

  subjectSharePurchased.save()
}

export function handleSubjectShareSoldTx(event: SubjectShareSold): void {
  let subjectShareSold = new MoxieBondingCurveSubjectShareSoldTx(getTxEntityId(event))
  subjectShareSold.blockInfo = getOrCreateBlockInfo(event.block).id
  subjectShareSold.txHash = event.transaction.hash
  subjectShareSold.subject = event.params._subject
  subjectShareSold.sellToken = event.params._sellToken
  subjectShareSold.sellAmount = event.params._sellAmount
  subjectShareSold.buyToken = event.params._buyToken
  subjectShareSold.buyAmount = event.params._buyAmount
  subjectShareSold.beneficiary = event.params._beneficiary
  subjectShareSold.txn = getOrCreateTransactionId(event.transaction.hash)

  subjectShareSold.save()
}

export function handleUpdateBeneficiaryTx(event: UpdateBeneficiary): void {
  let updateBeneficiary = new MoxieBondingCurveUpdateBeneficiaryTx(getTxEntityId(event))
  updateBeneficiary.blockInfo = getOrCreateBlockInfo(event.block).id
  updateBeneficiary.txHash = event.transaction.hash
  updateBeneficiary.beneficiary = event.params._beneficiary
  updateBeneficiary.txn = getOrCreateTransactionId(event.transaction.hash)

  updateBeneficiary.save()
}

export function handleUpdateFeesTx(event: UpdateFees): void {
  let updateFees = new MoxieBondingCurveUpdateFeesTx(getTxEntityId(event))
  updateFees.blockInfo = getOrCreateBlockInfo(event.block).id
  updateFees.txHash = event.transaction.hash
  updateFees.protocolBuyFeePct = event.params._protocolBuyFeePct
  updateFees.protocolSellFeePct = event.params._protocolSellFeePct
  updateFees.subjectBuyFeePct = event.params._subjectBuyFeePct
  updateFees.subjectSellFeePct = event.params._subjectSellFeePct
  updateFees.txn = getOrCreateTransactionId(event.transaction.hash)

  updateFees.save()
}

export function handleUpdateFormulaTx(event: UpdateFormula): void {
  let updateFormula = new MoxieBondingCurveUpdateFormulaTx(getTxEntityId(event))
  updateFormula.blockInfo = getOrCreateBlockInfo(event.block).id
  updateFormula.txHash = event.transaction.hash
  updateFormula.formula = event.params._formula
  updateFormula.txn = getOrCreateTransactionId(event.transaction.hash)

  updateFormula.save()
}