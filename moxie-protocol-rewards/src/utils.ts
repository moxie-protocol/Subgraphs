import { Address, Bytes, ethereum, BigInt } from '@graphprotocol/graph-ts'
import { BlockInfo, Reward, Summary, User } from '../generated/schema'
import { ORDER_REFERRER_FEE, ORDER_REFERRER_FEE_SIG, OTHER, PLATFORM_REFERRER_FEE, PLATFORM_REFERRER_FEE_SIG, PROTOCOL_FEE, PROTOCOL_FEE_SIG, TRANSACTION_FEE, TRANSACTION_FEE_SIG } from './constants'


export function getOrCreateBlockInfo(block: ethereum.Block): BlockInfo {
 let blockInfo = BlockInfo.load(block.number.toString())
 if (!blockInfo) {
  blockInfo = new BlockInfo(block.number.toString())
  blockInfo.timestamp = block.timestamp
  blockInfo.blockNumber = block.number
  blockInfo.hash = block.hash
  blockInfo.save()
 }
 return blockInfo
}

export function getOrCreateUser(userAddress: Address, block: ethereum.Block): User {
 let user = User.load(userAddress.toHexString())
 if (!user) {
  user = new User(userAddress.toHexString())
  user.totalReward = BigInt.zero()
  user.balanceReward = BigInt.zero()
  user.createdAtBlockNumber = block.number
  user.createdAtBlockInfo = getOrCreateBlockInfo(block).id
  saveUser(user, block)
 }
 return user
}

export function saveUser(user: User, block: ethereum.Block): void {
 user.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
 user.updatedAtBlockNumber = block.number
 user.save()
}

export function getRewardReason(reason: Bytes): string {
 let reasonHex = reason.toHexString()
 if (reasonHex == ORDER_REFERRER_FEE_SIG) {
  return ORDER_REFERRER_FEE
 } else if (reasonHex == PLATFORM_REFERRER_FEE_SIG) {
  return PLATFORM_REFERRER_FEE
 } else if (reasonHex == TRANSACTION_FEE_SIG) {
  return TRANSACTION_FEE
 } else if (reasonHex == PROTOCOL_FEE_SIG) {
  return PROTOCOL_FEE
 } else {
  return OTHER
 }
}

export function getOrCreateReward(user: User, rewardReason: string, block: ethereum.Block): Reward {
 let entityId = user.id.concat("-").concat(rewardReason)
 let reward = Reward.load(entityId)
 if (!reward) {
  reward = new Reward(entityId)
  reward.user = user.id
  reward.reason = rewardReason
  reward.total = BigInt.zero()
  reward.balance = BigInt.zero()
  reward.createdAtBlockInfo = getOrCreateBlockInfo(block).id
  reward.createdAtBlockNumber = block.number
  saveReward(reward, block)
 }
 return reward
}

export function saveReward(reward: Reward, block: ethereum.Block): void {
 reward.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
 reward.updatedAtBlockNumber = block.number
 reward.save()
}

export function getTxEntityId(event: ethereum.Event): string {
 return event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
}


export function handleWithdrawForReward(fromUser: User, amount: BigInt, block: ethereum.Block): void {
 let priorityList = [ORDER_REFERRER_FEE, PLATFORM_REFERRER_FEE, TRANSACTION_FEE, PROTOCOL_FEE]
 for (let i = 0; i < priorityList.length; i++) {
  let reward = Reward.load(fromUser.id.concat("-").concat(priorityList[i]))
  if (!reward) {
   continue
  }
  // amount 100, reward.amount 50 , 30 , 20
  if (reward.balance.gt(amount)) {
   reward.balance = reward.balance.minus(amount)
   saveReward(reward, block)
   break
  } else {
   amount = amount.minus(reward.balance)
   reward.balance = BigInt.zero()
   saveReward(reward, block)
  }
 }
}

export function getOrCreateSummary(): Summary {
 let summaryId = "SUMMARY"
 let summary = Summary.load(summaryId)
 if (!summary) {
  summary = new Summary(summaryId)
  summary.totalPlatformReferrerFee = BigInt.zero()
  summary.totalOrderReferrerFee = BigInt.zero()
  summary.totalProtocolFee = BigInt.zero()
  summary.totalTransactionFee = BigInt.zero()
  summary.totalOtherFee = BigInt.zero()
  summary.save()
 }
 return summary
}