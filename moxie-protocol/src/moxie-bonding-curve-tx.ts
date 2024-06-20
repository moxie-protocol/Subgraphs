import { BigInt } from "@graphprotocol/graph-ts"
import {
  BondingCurveInitialized,
  SubjectSharePurchased,
  SubjectShareSold,
  UpdateBeneficiary,
  UpdateFees,
  UpdateFormula,
} from "../generated/MoxieBondingCurve/MoxieBondingCurve"

import {
  MoxieBondingCurveBondingCurveInitializedTx,
  MoxieBondingCurveSubjectSharePurchasedTx,
  MoxieBondingCurveUpdateBeneficiaryTx,
  MoxieBondingCurveUpdateFeesTx,
  MoxieBondingCurveSubjectShareSoldTx,
  MoxieBondingCurveUpdateFormulaTx,
} from "../generated/schema"
export function handleBondingCurveInitializedTx(
  event: BondingCurveInitialized
): void {
  let bondingCurve = new MoxieBondingCurveBondingCurveInitializedTx(
    event.transaction.hash.toHex()
  )
  bondingCurve.subject = event.params._subject
  bondingCurve.subjectToken = event.params._subjectToken
  bondingCurve.initialSupply = event.params._initialSupply
  bondingCurve.reserve = event.params._reserve
  bondingCurve.reserveRatio = event.params._reserveRatio
  bondingCurve.save()
}

export function handleSubjectSharePurchasedTx(
  event: SubjectSharePurchased
): void {
  let subjectSharePurchased = new MoxieBondingCurveSubjectSharePurchasedTx(
    event.transaction.hash.toHex()
  )
  subjectSharePurchased.subject = event.params._subject
  subjectSharePurchased.sellToken = event.params._sellToken
  subjectSharePurchased.sellAmount = event.params._sellAmount
  subjectSharePurchased.buyToken = event.params._buyToken
  subjectSharePurchased.buyAmount = event.params._buyAmount
  subjectSharePurchased.beneficiary = event.params._beneficiary
  subjectSharePurchased.save()
}

export function handleSubjectShareSoldTx(event: SubjectShareSold): void {
  let subjectShareSold = new MoxieBondingCurveSubjectShareSoldTx(
    event.transaction.hash.toHex()
  )
  subjectShareSold.subject = event.params._subject
  subjectShareSold.sellToken = event.params._sellToken
  subjectShareSold.sellAmount = event.params._sellAmount
  subjectShareSold.buyToken = event.params._buyToken
  subjectShareSold.buyAmount = event.params._buyAmount
  subjectShareSold.beneficiary = event.params._beneficiary
  subjectShareSold.save()
}

export function handleUpdateBeneficiaryTx(event: UpdateBeneficiary): void {
  let updateBeneficiary = new MoxieBondingCurveUpdateBeneficiaryTx(
    event.transaction.hash.toHex()
  )
  updateBeneficiary.beneficiary = event.params._beneficiary
  updateBeneficiary.save()
}

export function handleUpdateFeesTx(event: UpdateFees): void {
  let updateFees = new MoxieBondingCurveUpdateFeesTx(
    event.transaction.hash.toHex()
  )
  updateFees.protocolBuyFeePct = event.params._protocolBuyFeePct
  updateFees.protocolSellFeePct = event.params._protocolSellFeePct
  updateFees.subjectBuyFeePct = event.params._subjectBuyFeePct
  updateFees.subjectSellFeePct = event.params._subjectSellFeePct
  updateFees.save()
}

export function handleUpdateFormulaTx(event: UpdateFormula): void {
  let updateFormula = new MoxieBondingCurveUpdateFormulaTx(
    event.transaction.hash.toHex()
  )
  updateFormula.formula = event.params._formula
  updateFormula.save()
}
