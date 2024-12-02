import { Address, BigInt, log, store } from "@graphprotocol/graph-ts"

import { Deposit, Withdraw } from '../generated/ProtocolRewards/ProtocolRewards'
import { LockInfo, Portfolio, Reward, RewardDeposit, RewardWithdraw } from '../generated/schema'
import { getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateReward, getOrCreateSubjectToken, getOrCreateSummary, getOrCreateUser, getTxEntityId, savePortfolio, saveReward, saveUser } from './utils'
import { RewardMap } from "./constants"


export function handleDeposit(event: Deposit): void {
 let blockInfo = getOrCreateBlockInfo(event.block)
 let entityId = getTxEntityId(event)
 let rewardReason = RewardMap.get(event.params._reason.toHexString())
 let rewardDeposit = new RewardDeposit(entityId)
 rewardDeposit.blockInfo = blockInfo.id
 rewardDeposit.blockNumber = event.block.number
 let fromUser = getOrCreateUser(event.params._from, event.block)
 saveUser(fromUser, event.block)
 let toUser = getOrCreateUser(event.params._to, event.block)
 toUser.totalRewards = toUser.totalRewards.plus(event.params._amount)
 toUser.balanceRewards = toUser.balanceRewards.plus(event.params._amount)
 saveUser(toUser, event.block)

 rewardDeposit.from = fromUser.id
 rewardDeposit.to = toUser.id
 rewardDeposit.amount = event.params._amount
 rewardDeposit.reason = rewardReason
 rewardDeposit.comment = event.params._comment
 rewardDeposit.save()

 // adding reward entity
 let reward = getOrCreateReward(toUser, rewardReason!, event.block)
 reward.amount = reward.amount.plus(event.params._amount)
 saveReward(reward, event.block)
}

export function handleWithdraw(event: Withdraw): void {
 let blockInfo = getOrCreateBlockInfo(event.block)
 let rewardWithdraw = new RewardWithdraw(getTxEntityId(event))
 rewardWithdraw.blockInfo = blockInfo.id
 let fromUser = getOrCreateUser(event.params._from, event.block)
 fromUser.balanceRewards = fromUser.balanceRewards.minus(event.params._amount)
 saveUser(fromUser, event.block)

 let toUser = getOrCreateUser(event.params._to, event.block)
 saveUser(toUser, event.block)

 rewardWithdraw.from = fromUser.id
 rewardWithdraw.to = toUser.id
 rewardWithdraw.amount = event.params._amount
 rewardWithdraw.save()
}
