import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  SubjectTokenDestination,
  Summary,
  TokenDestination,
  TokenLockManager,
} from "../../../generated/schema"
const SUMMARY_ID = "SUMMARY"

export function getOrCreateSummary(): Summary {
  let summary = Summary.load(SUMMARY_ID)
  if (summary == null) {
    summary = new Summary(SUMMARY_ID)
    summary.totalLockedBalance = BigInt.zero()
  }
  return summary
}

export function reduceSummaryBalance(amount: BigInt): void {
  let summary = getOrCreateSummary()
  summary.totalLockedBalance = summary.totalLockedBalance.minus(amount)
  summary.save()
}

export function increaseSummaryBalance(amount: BigInt): void {
  let summary = getOrCreateSummary()
  summary.totalLockedBalance = summary.totalLockedBalance.plus(amount)
  summary.save()
}

export function getOrCreateTokenDestination(
  tokenDestination: Address,
  manager: TokenLockManager,
  blockNumber: BigInt
): TokenDestination {
  let tokenDestinationId = tokenDestination.toHexString()
  let td = TokenDestination.load(tokenDestinationId)
  if (td == null) {
    td = new TokenDestination(tokenDestinationId)
    td.manager = manager.id
    td.tokenDestinationAllowed = false
    td.createdAtBlockNumber = blockNumber
    td.blockNumberUpdated = blockNumber
  }
  return td
}

export function saveTokenDestination(
  tokenDestination: TokenDestination,
  blockNumber: BigInt
): void {
  tokenDestination.blockNumberUpdated = blockNumber
  tokenDestination.save()
}



export function getOrCreateSubjectTokenDestination(
  subjectTokenDestination: Address,
  manager: TokenLockManager,
  blockNumber: BigInt
): SubjectTokenDestination {
  let tokenDestinationId = subjectTokenDestination.toHexString()
  let td = SubjectTokenDestination.load(tokenDestinationId)
  if (td == null) {
    td = new SubjectTokenDestination(tokenDestinationId)
    td.manager = manager.id
    td.subjectTokenDestinationAllowed = false
    td.createdAtBlockNumber = blockNumber
    td.blockNumberUpdated = blockNumber
  }
  return td
}

export function saveSubjectTokenDestination(
  subjectTokenDestination: SubjectTokenDestination,
  blockNumber: BigInt
): void {
  subjectTokenDestination.blockNumberUpdated = blockNumber
  subjectTokenDestination.save()
}
