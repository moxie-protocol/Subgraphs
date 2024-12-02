import { Address, BigInt, log, store } from "@graphprotocol/graph-ts"

import { Deposit, Withdraw } from '../generated/ProtocolRewards/ProtocolRewards'
import { LockInfo, Portfolio, RewardDeposit, RewardWithdraw } from '../generated/schema'
import { getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateSummary, getOrCreateUser, getTxEntityId, savePortfolio, saveUser } from './utils'
import { RewardMap } from "./constants"


export function handleDeposit(event: Deposit): void {
 let blockInfo = getOrCreateBlockInfo(event.block)

 let rewardDeposit = new RewardDeposit(getTxEntityId(event))
 rewardDeposit.blockInfo = blockInfo.id

 let fromUser = getOrCreateUser(event.params._from, event.block)
 saveUser(fromUser, event.block)
 let toUser = getOrCreateUser(event.params._to, event.block)
 toUser.totalRewards = toUser.totalRewards.plus(event.params._amount)
 saveUser(toUser, event.block)

 rewardDeposit.from = fromUser.id
 rewardDeposit.to = toUser.id
 rewardDeposit.amount = event.params._amount
 rewardDeposit.reason = RewardMap.get(event.params._reason.toHexString())
 rewardDeposit.comment = event.params._comment
 rewardDeposit.save()
}

export function handleWithdraw(event: Withdraw): void {
 let blockInfo = getOrCreateBlockInfo(event.block)
 let rewardWithdraw = new RewardWithdraw(getTxEntityId(event))
 rewardWithdraw.blockInfo = blockInfo.id
 let fromUser = getOrCreateUser(event.params._from, event.block)
 fromUser.totalRewards = fromUser.totalRewards.minus(event.params._amount)
 saveUser(fromUser, event.block)

 let toUser = getOrCreateUser(event.params._to, event.block)
 saveUser(toUser, event.block)

 rewardWithdraw.from = fromUser.id
 rewardWithdraw.to = toUser.id
 rewardWithdraw.amount = event.params._amount
 rewardWithdraw.save()
}
