import {
  Sync,
  Transfer
} from "../generated/UniswapV2Pair/UniswapV2Pair"
import {
  Sync as Sync2,
  Transfer as Transfer2
} from "../generated/AerodromePair/AerodromePair"
import {
  Deposit,
  Withdraw
} from "../generated/AerodromeGauge/AerodromeGauge"
import { Deposit as CLDeposit, Withdraw as CLWithdraw } from "../generated/AerodromeCLGauge/AerodromeCLGauge"
import { Mint, Burn, SetGaugeAndPositionManagerCall, Swap, Collect, CollectFees } from "../generated/AerodromeCLPool/AerodromeCLPool"
import { getOrCreateBlockInfo, getOrCreatePoolEntity, getOrCreateUserEntity, getOrCreateUserPoolEntity, getV3NftIdentifier, handleSyncEvents, handleTransferEvents } from "./utils"
import { GAUGE_LP_TOKEN_MAP } from "./constants"
import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { V3NftMint, V3NftTokenIdToLiquidity, NFTManager, User, UserPool, V3NftMintViaTransfer } from "../generated/schema"
import { NonfungiblePositionManager } from "../generated/templates"
export function handleSync(event: Sync): void {
  handleSyncEvents(event, event.params.reserve0, event.params.reserve1)
}

export function handleSync2(event: Sync2): void {
  handleSyncEvents(event, event.params.reserve0, event.params.reserve1)
}

//Handling transfers of LP Token. We need to track pool totalSupply and balance of each user
export function handleTransfer(event: Transfer): void {
  handleTransferEvents(event, event.params.from, event.params.to, event.params.value, event.address.toHexString())
}

export function handleTransfer2(event: Transfer2): void {
  handleTransferEvents(event, event.params.from, event.params.to, event.params.value, event.address.toHexString())
}

// handling mint and burn events for the AerodromeCLPool
export function handleMint(event: Mint): void {
  // assuming transaction.from is the user who minted the tokens
  let entityId = getV3NftIdentifier(event.transaction.hash, event.params.amount, event.params.amount0, event.params.amount1)
  let entity = new V3NftMint(entityId)
  entity.save()

  let txEntity = new V3NftMintViaTransfer(event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString()))
  txEntity.save()

  handleTransferEvents(event, Address.zero(), event.transaction.from, event.params.amount, event.address.toHexString())
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.plus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.plus(event.params.amount1)
  pool.updatedAt = getOrCreateBlockInfo(event).id
  pool.save()
}

export function handleSwap(event: Swap): void {
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.plus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.plus(event.params.amount1)
  pool.updatedAt = getOrCreateBlockInfo(event).id
  pool.save()
}

export function handleCollectFees(event: CollectFees): void {
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.minus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.minus(event.params.amount1)
  pool.updatedAt = getOrCreateBlockInfo(event).id
  pool.save()
}

export function handleBurn(event: Burn): void {
  // assuming transaction.from is the user who burned the tokens
  handleTransferEvents(event, event.transaction.from, Address.zero(), event.params.amount, event.address.toHexString())
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.minus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.minus(event.params.amount1)
  pool.updatedAt = getOrCreateBlockInfo(event).id
  pool.save()
}

//When the Aerodrome Gauge Contract is invoked when LP Tokens are deposited we need to track it
export function handleDeposit(event: Deposit): void {
  //First Get the Pool from the gauge contract
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let poolAddress = poolId.toString()
    let pool = getOrCreatePoolEntity(event, poolAddress)
    //Second get the user from the to address
    let user = getOrCreateUserEntity(event, event.params.to.toHexString())
    //Third fetch and update staking balance of the userpool with amount
    let userPool = getOrCreateUserPoolEntity(event, user.id, pool.id)
    userPool.stakedLPAmount = userPool.stakedLPAmount.plus(event.params.amount)
    userPool.totalLPAmount = userPool.stakedLPAmount.plus(userPool.unstakedLpAmount)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}

//When the Aerodrome Gauge Contract is invoked when LP Tokens are withdrawn we need to track it
export function handleWithdraw(event: Withdraw): void {
  //First Get the Pool from the gauge contract
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let poolAddress = poolId.toString()
    let pool = getOrCreatePoolEntity(event, poolAddress)
    //Second get the user from the from address
    let user = getOrCreateUserEntity(event, event.params.from.toHexString())
    //Third fetch and update staking balance of the userpool with amount
    let userPool = getOrCreateUserPoolEntity(event, user.id, pool.id)
    userPool.stakedLPAmount = userPool.stakedLPAmount.minus(event.params.amount)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}


export function handleSetGaugeAndPositionManager(call: SetGaugeAndPositionManagerCall): void {
  let entity = new NFTManager(call.inputs._nft.toHexString())
  entity.save()
  // creating new handler for the NFTManager contract
  NonfungiblePositionManager.create(call.inputs._nft)
}

export function handleCLDeposit(event: CLDeposit): void {
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(event.params.tokenId.toString())
    if (!tokenIdToLiquidity) {
      log.info("Not a IncreaseLiquidity event to be handled", [])
      return
    }
    if (!tokenIdToLiquidity.ownerPool) {
      throw new Error("OwnerPool not found for tokenId: " + event.params.tokenId.toString() + "txHash: " + event.transaction.hash.toHexString())
    }
    let userPool = UserPool.load(tokenIdToLiquidity.ownerPool!)
    if (!userPool) {
      throw new Error("OwnerPool not found for tokenId: " + event.params.tokenId.toString() + "txHash: " + event.transaction.hash.toHexString())
    }
    userPool.stakedLPAmount = userPool.stakedLPAmount.plus(event.params.liquidityToStake)
    userPool.totalLPAmount = userPool.stakedLPAmount.plus(userPool.unstakedLpAmount)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}
export function handleCLWithdraw(event: CLWithdraw): void {
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(event.params.tokenId.toString())
    if (!tokenIdToLiquidity) {
      log.info("Not a DecreaseLiquidity event to be handled", [])
      return
    }
    if (!tokenIdToLiquidity.ownerPool) {
      throw new Error("OwnerPool not found for tokenId: " + event.params.tokenId.toString() + "txHash: " + event.transaction.hash.toHexString())
    }
    let userPool = UserPool.load(tokenIdToLiquidity.ownerPool!)
    if (!userPool) {
      throw new Error("OwnerPool not found for tokenId: " + event.params.tokenId.toString() + "txHash: " + event.transaction.hash.toHexString())
    }
    userPool.stakedLPAmount = userPool.stakedLPAmount.minus(event.params.liquidityToStake)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}