import {
  SubjectOnboardingFinished,
  UpdateBeneficiary,
  UpdateFees,
  UpdateAuctionParam,
} from "../generated/SubjectFactory/SubjectFactory"

import { newMockEvent } from "matchstick-as"
import {
  SubjectOnboardingFinishedInput,
  UpdateBeneficiaryInput,
  UpdateFeesInput,
  UpdateAuctionParamInput,
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

export function mockSubjectOnboardingFinished(
  input: SubjectOnboardingFinishedInput
): SubjectOnboardingFinished {
  let subjectOnboardingFinished = changetype<SubjectOnboardingFinished>(
    newMockEvent()
  )
  let subject = getAddressEventParam("_subject", input.subject)
  let subjectToken = getAddressEventParam("_subjectToken", input.subjectToken)
  let auctionId = getBigIntEventParam("_auctionId", input.auctionId)
  let bondingSupply = getBigIntEventParam("_bondingSupply", input.bondingSupply)
  let bondingAmount = getBigIntEventParam("_bondingAmount", input.bondingAmount)
  let protocolFee = getBigIntEventParam("_protocolFee", input.protocolFee)
  let subjectFee = getBigIntEventParam("_subjectFee", input.subjectFee)
  subjectOnboardingFinished.parameters = [
    subject,
    subjectToken,
    auctionId,
    bondingSupply,
    bondingAmount,
    protocolFee,
    subjectFee,
  ]
  subjectOnboardingFinished.transaction.hash = Bytes.fromHexString(input.hash)
  subjectOnboardingFinished.address = Address.fromString(input.contractAddress)
  return subjectOnboardingFinished
}

export function mockUpdateBeneficiary(
  input: UpdateBeneficiaryInput
): UpdateBeneficiary {
  let updateBeneficiary = changetype<UpdateBeneficiaryInput>(newMockEvent())
  let beneficiary = getAddressEventParam("_beneficiary", input.beneficiary)
  updateBeneficiary.parameters = [beneficiary]
  updateBeneficiary.transaction.hash = Bytes.fromHexString(input.hash)
  updateBeneficiary.address = Address.fromString(input.contractAddress)
  return updateBeneficiary
}

export function mockUpdateFees(input: UpdateFeesInput): UpdateFees {
  let updateFees = changetype<UpdateFees>(newMockEvent())
  updateFees.transaction.hash = Bytes.fromHexString(input.hash)
  updateFees.address = Address.fromString(input.contractAddress)
  return updateFees
}

export function mockUpdateAuctionParam(
  input: UpdateAuctionParamInput
): UpdateAuctionParam {
  let updateAuctionParam = changetype<UpdateAuctionParam>(newMockEvent())
  let auctionDuration = getBigIntEventParam(
    "_auctionDuration",
    input.auctionDuration
  )
  let auctionOrderCancellationDuration = getBigIntEventParam(
    "_auctionOrderCancellationDuration",
    input.auctionOrderCancellationDuration
  )
  updateAuctionParam.parameters = [
    auctionDuration,
    auctionOrderCancellationDuration,
  ]
  updateAuctionParam.transaction.hash = Bytes.fromHexString(input.hash)
  updateAuctionParam.address = Address.fromString(input.contractAddress)
  return updateAuctionParam
}
