import {
  BondingCurveInitialized,
  SubjectSharePurchased,
  SubjectShareSold,
} from "../../generated/MoxieBondingCurve/MoxieBondingCurve"

import { newMockEvent } from "matchstick-as"
import {
  MoxieBondingCurveBondingCurveInitializedInput,
  MoxieBondingCurveSubjectSharePurchasedInput,
  MoxieBondingCurveSubjectShareSoldInput,
} from "./types"
import {
  addressValue,
  getAddressEventParam,
  getBigIntEventParam,
  getBooleanEventParam,
  getBytesEventParam,
  getStringEventParam,
} from "./utils"
import { Address, Bytes } from "@graphprotocol/graph-ts"

export function mockBondingCurveInitialized(
  input: MoxieBondingCurveBondingCurveInitializedInput
): BondingCurveInitialized {
  let bondingCurveInitialized = changetype<BondingCurveInitialized>(
    newMockEvent()
  )
  let subject = getAddressEventParam("_subject", input.subject)
  let subjectToken = getAddressEventParam("_subjectToken", input.subjectToken)
  let initialSupply = getBigIntEventParam("_initialSupply", input.initialSupply)
  let reserve = getBigIntEventParam("_reserve", input.reserve)
  let reserveRatio = getBigIntEventParam("_reserveRatio", input.reserveRatio)
  bondingCurveInitialized.parameters = [
    subject,
    subjectToken,
    initialSupply,
    reserve,
    reserveRatio,
  ]
  bondingCurveInitialized.transaction.hash = Bytes.fromHexString(input.hash)
  return bondingCurveInitialized
}

export function mockSubjectSharePurchased(
  input: MoxieBondingCurveSubjectSharePurchasedInput
): SubjectSharePurchased {
  let subjectSharePurchased = changetype<SubjectSharePurchased>(newMockEvent())
  let subject = getAddressEventParam("_subject", input.subject)
  let sellToken = getAddressEventParam("_sellToken", input.sellToken)
  let sellAmount = getBigIntEventParam("_sellAmount", input.sellAmount)
  let buyToken = getAddressEventParam("_buyToken", input.buyToken)
  let buyAmount = getBigIntEventParam("_buyAmount", input.buyAmount)
  let beneficiary = getAddressEventParam("_beneficiary", input.beneficiary)
  subjectSharePurchased.parameters = [
    subject,
    sellToken,
    sellAmount,
    buyToken,
    buyAmount,
    beneficiary,
  ]
  subjectSharePurchased.transaction.hash = Bytes.fromHexString(input.hash)
  return subjectSharePurchased
}

export function mockSubjectShareSold(
  input: MoxieBondingCurveSubjectShareSoldInput
): SubjectShareSold {
  let subjectShareSold = changetype<SubjectShareSold>(newMockEvent())
  let subject = getAddressEventParam("_subject", input.subject)
  let sellToken = getAddressEventParam("_sellToken", input.sellToken)
  let sellAmount = getBigIntEventParam("_sellAmount", input.sellAmount)
  let buyToken = getAddressEventParam("_buyToken", input.buyToken)
  let buyAmount = getBigIntEventParam("_buyAmount", input.buyAmount)
  let beneficiary = getAddressEventParam("_beneficiary", input.beneficiary)
  subjectShareSold.parameters = [
    subject,
    sellToken,
    sellAmount,
    buyToken,
    buyAmount,
    beneficiary,
  ]
  subjectShareSold.transaction.hash = Bytes.fromHexString(input.hash)
  return subjectShareSold
}
