import {
  SubjectOnboardingFinished,
  UpdateBeneficiary,
  UpdateFees,
  UpdateAuctionParam,
} from "../generated/SubjectFactory/SubjectFactory"
export function handleSubjectOnboardingFinished(
  event: SubjectOnboardingFinished
): void {}

export function handleUpdateBeneficiary(event: UpdateBeneficiary): void {}

export function handleUpdateFees(event: UpdateFees): void {}

export function handleUpdateAuctionParam(event: UpdateAuctionParam): void {}
