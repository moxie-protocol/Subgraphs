import { BigInt } from "@graphprotocol/graph-ts"
import { Summary } from "../../../generated/schema"
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
