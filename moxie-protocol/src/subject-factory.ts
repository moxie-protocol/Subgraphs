import { BigInt } from "@graphprotocol/graph-ts"
import { Auction } from "../generated/schema"
import { SubjectOnboardingInitiated, SubjectOnboardingFinished } from "../generated/SubjectFactory/SubjectFactory"
import { getOrCreateBlockInfo, getOrCreateSubjectToken, getOrCreateSummary, isBlacklistedAuction, isBlacklistedSubjectTokenAddress, loadAuction, saveSubjectToken } from "./utils"
import { ONBOARDING_STATUS_ONBOARDING_FINISHED } from "./constants"

export function handleSubjectOnboardingInitiated(event: SubjectOnboardingInitiated): void {
  if (isBlacklistedAuction(event.params._auctionId.toString())) {
    return
  }
  if (isBlacklistedSubjectTokenAddress(event.params._subjectToken)) {
    return
  }
  let auction = loadAuction(event.params._auctionId)
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
  auction.subjectToken = subjectToken.id
  auction.save()

  subjectToken.auction = auction.id
  subjectToken.save()
}
export function handleSubjectOnboardingFinished(event: SubjectOnboardingFinished): void {
  if (isBlacklistedAuction(event.params._auctionId.toString())) {
    return
  }
  let auctionId = event.params._auctionId
  let subjectFee = event.params._subjectFee
  let protocolFee = event.params._protocolFee
  let bondingAmount = event.params._bondingAmount

  let auction = loadAuction(auctionId)
  auction.amountRaised = bondingAmount.plus(protocolFee).plus(subjectFee)
  auction.subjectFee = subjectFee
  auction.protocolFee = protocolFee
  auction.endTxHash = event.transaction.hash
  auction.endBlockInfo = getOrCreateBlockInfo(event.block).id
  auction.endBlockNumber = event.block.number
  auction.save()

  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
  subjectToken.status = ONBOARDING_STATUS_ONBOARDING_FINISHED
  saveSubjectToken(subjectToken, event.block)

  let summary = getOrCreateSummary()
  summary.totalBuyVolume = summary.totalBuyVolume.plus(auction.amountRaised)
  summary.totalProtocolFeeFromAuction = summary.totalProtocolFeeFromAuction.plus(protocolFee)
  summary.totalSubjectFeeFromAuction = summary.totalSubjectFeeFromAuction.plus(subjectFee)
  summary.save()
}
