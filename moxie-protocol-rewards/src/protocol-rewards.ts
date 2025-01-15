import { Address, BigInt, log, store } from "@graphprotocol/graph-ts"

import { Deposit, Withdraw } from '../generated/ProtocolRewards/ProtocolRewards'
import { RewardDeposit, RewardWithdraw } from '../generated/schema'
import { getOrCreateBlockInfo, getOrCreateReward, getOrCreateSummary, getOrCreateUser, getRewardReason, getTxEntityId, handleWithdrawForReward, saveReward, saveUser } from './utils'
import { ORDER_REFERRER_FEE, OTHER, PLATFORM_REFERRER_FEE, PROTOCOL_FEE, TRANSACTION_FEE } from "./constants"


export function handleDeposit(event: Deposit): void {
 let blockInfo = getOrCreateBlockInfo(event.block)
 let entityId = getTxEntityId(event)
 let rewardReason = getRewardReason(event.params._reason)
 let rewardDeposit = new RewardDeposit(entityId)
 rewardDeposit.txHash = event.transaction.hash
 rewardDeposit.blockInfo = blockInfo.id
 rewardDeposit.blockNumber = event.block.number
 let fromUser = getOrCreateUser(event.params._from, event.block)
 saveUser(fromUser, event.block)
 let toUser = getOrCreateUser(event.params._to, event.block)
 toUser.totalReward = toUser.totalReward.plus(event.params._amount)
 toUser.balanceReward = toUser.balanceReward.plus(event.params._amount)
 saveUser(toUser, event.block)

 rewardDeposit.from = fromUser.id
 rewardDeposit.to = toUser.id
 rewardDeposit.amount = event.params._amount
 rewardDeposit.reason = rewardReason
 rewardDeposit.comment = event.params._comment
 rewardDeposit.save()

 // adding reward entity
 let reward = getOrCreateReward(toUser, rewardReason, event.block)
 reward.total = reward.total.plus(event.params._amount)
 reward.balance = reward.balance.plus(event.params._amount)
 saveReward(reward, event.block)

 let summary = getOrCreateSummary()
 if (rewardReason == PLATFORM_REFERRER_FEE) {
  summary.totalPlatformReferrerFee = summary.totalPlatformReferrerFee.plus(event.params._amount)
 } else if (rewardReason == ORDER_REFERRER_FEE) {
  summary.totalOrderReferrerFee = summary.totalOrderReferrerFee.plus(event.params._amount)
 } else if (rewardReason == PROTOCOL_FEE) {
  summary.totalProtocolFee = summary.totalProtocolFee.plus(event.params._amount)
 } else if (rewardReason == TRANSACTION_FEE) {
  summary.totalTransactionFee = summary.totalTransactionFee.plus(event.params._amount)
 } else if (rewardReason == OTHER) {
  summary.totalOtherFee = summary.totalOtherFee.plus(event.params._amount)
 }
 summary.save()
}

export function handleWithdraw(event: Withdraw): void {
 let blockInfo = getOrCreateBlockInfo(event.block)
 let rewardWithdraw = new RewardWithdraw(getTxEntityId(event))
 rewardWithdraw.blockInfo = blockInfo.id
 rewardWithdraw.blockNumber = event.block.number
 rewardWithdraw.txHash = event.transaction.hash
 let fromUser = getOrCreateUser(event.params._from, event.block)
 fromUser.balanceReward = fromUser.balanceReward.minus(event.params._amount)
 saveUser(fromUser, event.block)

 let toUser = getOrCreateUser(event.params._to, event.block)
 saveUser(toUser, event.block)

 rewardWithdraw.from = fromUser.id
 rewardWithdraw.to = toUser.id
 rewardWithdraw.amount = event.params._amount
 rewardWithdraw.save()

 handleWithdrawForReward(fromUser, event.params._amount, event.block)
}
