import { SubjectFactorySubjectOnboardingFinishedTx, SubjectFactorySubjectOnboardingInitiatedTx } from "../generated/schema"
import { SubjectOnboardingInitiated, SubjectOnboardingFinished } from "../generated/SubjectFactory/SubjectFactory"
import { getOrCreateBlockInfo, getOrCreateTransactionId, getTxEntityId } from "./utils"

export function handleSubjectOnboardingInitiatedTx(event: SubjectOnboardingInitiated): void {
  let txId = getTxEntityId(event)
  let txn = SubjectFactorySubjectOnboardingInitiatedTx.load(txId)
  if (!txn) {
    txn = new SubjectFactorySubjectOnboardingInitiatedTx(txId)
  }
  txn.txHash = event.transaction.hash
  txn.blockInfo = getOrCreateBlockInfo(event.block).id

  txn.subject = event.params._subject
  txn.subjectToken = event.params._subjectToken
  txn.auctionAmount = event.params._auctionAmount
  txn.biddingToken = event.params._biddingToken
  txn.auctionEndDate = event.params.auctionEndDate
  txn.auctionId = event.params._auctionId
  txn.txn = getOrCreateTransactionId(event.transaction.hash)
  txn.save()
}
export function handleSubjectOnboardingFinishedTx(event: SubjectOnboardingFinished): void {
  let txId = getTxEntityId(event)
  let txn = SubjectFactorySubjectOnboardingFinishedTx.load(txId)
  if (!txn) {
    txn = new SubjectFactorySubjectOnboardingFinishedTx(txId)
  }
  txn.txHash = event.transaction.hash
  txn.blockInfo = getOrCreateBlockInfo(event.block).id

  txn.subject = event.params._subject
  txn.subjectToken = event.params._subjectToken
  txn.auctionId = event.params._auctionId
  txn.bondingSupply = event.params._bondingSupply
  txn.bondingAmount = event.params._bondingAmount
  txn.protocolFee = event.params._protocolFee
  txn.subjectFee = event.params._subjectFee
  txn.txn = getOrCreateTransactionId(event.transaction.hash)
  txn.save()
}
