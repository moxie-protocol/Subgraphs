import {BigInt, ethereum, Address } from "@graphprotocol/graph-ts"
import { BlockInfo, Pool, User, UserPool } from "../generated/schema"

export function getOrCreateBlockInfo(event: ethereum.Event): BlockInfo {
    let blockInfo = BlockInfo.load(event.block.number.toString())
    if (!blockInfo) {
      blockInfo = new BlockInfo(event.block.number.toString())
      blockInfo.timestamp = event.block.timestamp
      blockInfo.blockNumber = event.block.number
      blockInfo.hash = event.block.hash
      blockInfo.save()
    }
    return blockInfo
}

export function getOrCreatePoolEntity(event: ethereum.Event, poolAddress: string): Pool {
    let pool = Pool.load(poolAddress)
    if(!pool) {
      pool = new Pool(event.address.toHexString())
      pool.createdAt = getOrCreateBlockInfo(event).id
      pool.updatedAt = pool.createdAt
      pool.nonMoxieReserve = BigInt.zero()
      pool.moxieReserve = BigInt.zero()
      pool.totalSupply = BigInt.zero()
    }
    return pool
}

export function getOrCreateUserEntity(event: ethereum.Event, userAddress: string): User {
  let user = User.load(userAddress)
  if(!user) {
    user = new User(userAddress)
    user.createdAt = getOrCreateBlockInfo(event).id
    user.save()
  }
  return user
}

export function getOrCreateUserPoolEntity(event: ethereum.Event, userAddress: string, pool: string): UserPool {
  let userPoolId = userAddress+"-"+pool
  let userPool = UserPool.load(userPoolId)
  if(!userPool) {
    userPool = new UserPool(userPoolId)
    userPool.pool = getOrCreatePoolEntity(event, pool).id 
    userPool.user = getOrCreateUserEntity(event, userAddress).id
    userPool.createdAt = getOrCreateBlockInfo(event).id
    userPool.updatedAt = userPool.createdAt
    userPool.unstakedLpAmount = BigInt.zero()
    userPool.stakedLPAmount = BigInt.zero()
    userPool.totalLPAmount = BigInt.zero()
  }
  return userPool
}

export function handleSyncEvents(event: ethereum.Event, reserve0: BigInt, reserve1: BigInt): void{
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  //Currently in both aerodrome and uniswap reserve1 is always moxie. Because addresses are sorted when deciding which is token0 and token1. 
  //Might need to extend in the future
  pool.nonMoxieReserve = reserve0
  pool.moxieReserve = reserve1
  pool.save()
}

export function handleTransferEvents(event: ethereum.Event, from: Address, to: Address, amount: BigInt): void {
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  if (from == Address.zero()) {
    // Mint: increase total supply
    pool.totalSupply = pool.totalSupply.plus(amount)
    let receiver = getOrCreateUserEntity(event, to.toHexString()) 
    let receiverUserPool = getOrCreateUserPoolEntity(event, receiver.id, pool.id)
    receiverUserPool.unstakedLpAmount = receiverUserPool.unstakedLpAmount.plus(amount)
    receiverUserPool.totalLPAmount = receiverUserPool.stakedLPAmount.plus(receiverUserPool.unstakedLpAmount)
    receiverUserPool.updatedAt = getOrCreateBlockInfo(event).id
    receiverUserPool.latestTransactionHash = event.transaction.hash
    pool.save()
    receiverUserPool.save()


  } else if (to == Address.zero()) {
    // Burn: decrease total supply
    pool.totalSupply = pool.totalSupply.minus(amount)
    let sender = getOrCreateUserEntity(event, from.toHexString())
    let senderUserPool = getOrCreateUserPoolEntity(event, sender.id, pool.id) 
    senderUserPool.updatedAt = getOrCreateBlockInfo(event).id
    senderUserPool.latestTransactionHash = event.transaction.hash
    pool.save()
    senderUserPool.save()

  } else {
    
    let sender = getOrCreateUserEntity(event, from.toHexString()) 
    let receiver = getOrCreateUserEntity(event, to.toHexString()) 
  
    let senderUserPool = getOrCreateUserPoolEntity(event, sender.id, pool.id)
    let receiverUserPool = getOrCreateUserPoolEntity(event, receiver.id, pool.id)
    senderUserPool.unstakedLpAmount = senderUserPool.unstakedLpAmount.minus(amount)
    receiverUserPool.unstakedLpAmount = receiverUserPool.unstakedLpAmount.plus(amount)
    senderUserPool.totalLPAmount = senderUserPool.stakedLPAmount.plus(senderUserPool.unstakedLpAmount)
    receiverUserPool.totalLPAmount = receiverUserPool.stakedLPAmount.plus(receiverUserPool.unstakedLpAmount)
    senderUserPool.updatedAt = getOrCreateBlockInfo(event).id
    receiverUserPool.updatedAt = getOrCreateBlockInfo(event).id
    senderUserPool.latestTransactionHash = event.transaction.hash
    receiverUserPool.latestTransactionHash = event.transaction.hash
  
    pool.save()
    senderUserPool.save()
    receiverUserPool.save()
  }

}