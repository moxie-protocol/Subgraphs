import { BigInt } from "@graphprotocol/graph-ts"
import {
  BondingCurveInitialized,
  SubjectSharePurchased,
  SubjectShareSold,
  UpdateBeneficiary,
  UpdateFees,
  UpdateFormula,
} from "../generated/MoxieBondingCurve/MoxieBondingCurve"

export function handleBondingCurveInitialized(
  event: BondingCurveInitialized
): void {}

export function handleSubjectSharePurchased(
  event: SubjectSharePurchased
): void {}

export function handleSubjectShareSold(event: SubjectShareSold): void {}

export function handleUpdateBeneficiary(event: UpdateBeneficiary): void {}

export function handleUpdateFees(event: UpdateFees): void {}

export function handleUpdateFormula(event: UpdateFormula): void {}
