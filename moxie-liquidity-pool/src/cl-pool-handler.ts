import {
  Burn,
  CollectFees,
  Flash,
  Mint,
  Swap,
} from "../generated/AerodromeCLPool/AerodromeCLPool"
import {
  getOrCreateBlockInfo,
  getOrCreatePoolEntity,
  handleMintToAddLiquidityTx,
  handleMintToTransferTx,
  savePool,
} from "./utils"

export function handleMint(event: Mint): void {
  handleMintToAddLiquidityTx(
    event.transaction.hash,
    event.params.amount,
    event.params.amount0,
    event.params.amount1
  )
  handleMintToTransferTx(event)
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.plus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.plus(event.params.amount1)
  pool.totalSupply = pool.totalSupply.plus(event.params.amount)
  savePool(event, pool)
}

export function handleSwap(event: Swap): void {
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.plus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.plus(event.params.amount1)
  savePool(event, pool)
}

export function handleBurn(event: Burn): void {
  // burn will be there before DecreaseLiquidity

  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.minus(event.params.amount0)
  pool.moxieReserve = pool.moxieReserve.minus(event.params.amount1)
  pool.totalSupply = pool.totalSupply.minus(event.params.amount)
  savePool(event, pool)
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

export function handleFlash(event: Flash): void {
  // handling pool
  // amount0 is non moxie (for current case), may need to extend in the future
  // amount1 is moxie (for current case), may need to extend in the future
  let pool = getOrCreatePoolEntity(event, event.address.toHexString())
  pool.nonMoxieReserve = pool.nonMoxieReserve.minus(event.params.paid0)
  pool.moxieReserve = pool.moxieReserve.minus(event.params.paid1)
  savePool(event, pool)
}
