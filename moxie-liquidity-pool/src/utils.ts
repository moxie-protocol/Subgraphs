import {BigInt, ethereum, Address,Bytes, log } from "@graphprotocol/graph-ts"
import { BlockInfo, Pool, Position, User, UserPool, MintToAddLiquidityTx, MintToTransferTx } from "../generated/schema"

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

export function getV3MintToLiquidityTxId(
  txHash: Bytes,
  liquidity: BigInt,
  amount0: BigInt,
  amount1: BigInt
): string {
  return (
    txHash.toHexString() +
    "-" +
    liquidity.toString() +
    "-" +
    amount0.toString() +
    "-" +
    amount1.toString()
  )
}

export function IsMintToAddLiquidityTx(
  txHash: Bytes,
  liquidity: BigInt,
  amount0: BigInt,
  amount1: BigInt
): boolean {
  let entityId = getV3MintToLiquidityTxId(txHash, liquidity, amount0, amount1)
  let mintToAddLiquidityTx = MintToAddLiquidityTx.load(entityId)
  return !!mintToAddLiquidityTx
}

export function handleMintToAddLiquidityTx(
  txHash: Bytes,
  liquidity: BigInt,
  amount0: BigInt,
  amount1: BigInt
): void {
  let entityId = getV3MintToLiquidityTxId(txHash, liquidity, amount0, amount1)
  let mintToAddLiquidityTx = new MintToAddLiquidityTx(entityId)
  mintToAddLiquidityTx.save()
}

export function handleMintToTransferTx(event: ethereum.Event): void {
  let entityId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
  let mintToTransferTx = new MintToTransferTx(entityId)
  mintToTransferTx.save()
}

export function IsMintToTransferTx(event: ethereum.Event): boolean {
  let entityId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.minus(BigInt.fromI32(1)).toString())
  let mintToTransferTx = MintToTransferTx.load(entityId)
  return !!mintToTransferTx
}


export function savePosition(event: ethereum.Event, position:Position): void {
  position.updatedAt = getOrCreateBlockInfo(event).id
  position.save()
}

export function saveUserPool(event: ethereum.Event, userPool:UserPool,isStake:bool=false): void {
  userPool.totalLPAmount = userPool.stakedLPAmount.plus(userPool.unstakedLpAmount)
  if(userPool.totalLPAmount.lt(BigInt.fromI32(0))) {
    log.info("userPool.totalLPAmount is less than 0, txHash: {}", [
      event.transaction.hash.toHexString(),
    ])
    throw new Error("userPool.totalLPAmount is less than 0, txHash: " + event.transaction.hash.toHexString())
  }
  userPool.updatedAt = getOrCreateBlockInfo(event).id
  if(isStake) {
    userPool.latestStakeTransactionHash = event.transaction.hash
  }else{
    userPool.latestTransactionHash = event.transaction.hash
  }
  userPool.save()
}

export function savePool(event: ethereum.Event, pool:Pool): void {
  if(pool.totalSupply.lt(BigInt.fromI32(0))) {
    log.info("pool.totalSupply is less than 0, txHash: {}", [
      event.transaction.hash.toHexString(),
    ])
    throw new Error("pool.totalSupply is less than 0, txHash: " + event.transaction.hash.toHexString())
  }
  if(pool.nonMoxieReserve.lt(BigInt.fromI32(0)) || pool.moxieReserve.lt(BigInt.fromI32(0))) {
    log.info("pool.nonMoxieReserve or pool.moxieReserve is less than 0, txHash: {}", [
      event.transaction.hash.toHexString(),
    ])
    throw new Error("pool.nonMoxieReserve or pool.moxieReserve is less than 0, txHash: " + event.transaction.hash.toHexString())
  }
  pool.latestTransactionHash = event.transaction.hash
  pool.updatedAt = getOrCreateBlockInfo(event).id
  pool.save()
}
