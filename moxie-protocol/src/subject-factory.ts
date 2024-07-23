import { BigInt } from "@graphprotocol/graph-ts"
import { Auction } from "../generated/schema"
import { SubjectOnboardingInitiated, SubjectOnboardingFinished } from "../generated/SubjectFactory/SubjectFactory"
import { getOrCreateBlockInfo, getOrCreateSubjectToken, getOrCreateSummary, saveSubjectToken } from "./utils"
import { ONBOARDING_STATUS_ONBOARDING_FINISHED } from "./constants"

export function handleSubjectOnboardingInitiated(event: SubjectOnboardingInitiated): void {
  let auction = Auction.load(event.params._auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + event.params._auctionId.toString())
  }
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, auction, event.block)
  auction.subjectToken = subjectToken.id
  auction.save()
}
export function handleSubjectOnboardingFinished(event: SubjectOnboardingFinished): void {
  let auctionId = event.params._auctionId.toString()
  let subjectFee = event.params._subjectFee
  let protocolFee = event.params._protocolFee
  let bondingAmount = event.params._bondingAmount
  let auction = Auction.load(auctionId)
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + auctionId)
  }
  auction.amountRaised = bondingAmount.plus(protocolFee).plus(subjectFee)
  auction.subjectFee = subjectFee
  auction.protocolFee = protocolFee
  auction.endTxHash = event.transaction.hash
  auction.endBlockInfo = getOrCreateBlockInfo(event.block).id
  auction.save()

  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, auction, event.block)
  subjectToken.status = ONBOARDING_STATUS_ONBOARDING_FINISHED
  saveSubjectToken(subjectToken, event.block)

  let summary = getOrCreateSummary()
  summary.totalBuyVolume = summary.totalBuyVolume.plus(auction.amountRaised)
  summary.totalProtocolFeeFromAuction = summary.totalProtocolFeeFromAuction.plus(protocolFee)
  summary.totalSubjectFeeFromAuction = summary.totalSubjectFeeFromAuction.plus(subjectFee)
  summary.save()
}
