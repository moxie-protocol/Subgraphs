import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  IncreaseLiquidity,
  DecreaseLiquidity,
  Transfer,
} from "../generated/templates/NonfungiblePositionManager/NonfungiblePositionManager"
import {
  getOrCreateBlockInfo,
  getOrCreatePoolEntity,
  getOrCreateUserPoolEntity,
  handleTransferEvents,
  IsMintToAddLiquidityTx,
  IsMintToTransferTx,
  savePosition,
  saveUserPool,
} from "./utils"
import { Pool, Position, UserPool } from "../generated/schema"
import { AerodromeCLGaugeAddress, NFT_MANAGER_POOL_MAP } from "./constants"

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  if (
    !IsMintToAddLiquidityTx(
      event.transaction.hash,
      event.params.liquidity,
      event.params.amount0,
      event.params.amount1
    )
  ) {
    return
  }

  let position = Position.load(event.params.tokenId.toString())
  if (!position) {
    position = new Position(event.params.tokenId.toString())
    position.unstakedLpAmount = event.params.liquidity
    position.createdAt = getOrCreateBlockInfo(event).id
  } else {
    // this position created from transfer event
    log.info("position created from transfer event, txHash: {}", [
      event.transaction.hash.toHexString(),
    ])
    position.unstakedLpAmount = position.unstakedLpAmount.plus(
      event.params.liquidity
    )
    if (position.userPool) {
      let userPool = UserPool.load(position.userPool!)
      if (userPool) {
        userPool.unstakedLpAmount = position.unstakedLpAmount
        saveUserPool(event, userPool)
      } else {
        throw new Error(
          "userPool not found for position: " +
            position.id +
            " txHash: " +
            event.transaction.hash.toHexString()
        )
      }
    }
  }
  savePosition(event, position)
}

export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
  let position = Position.load(event.params.tokenId.toString())
  if (!position) {
   // position not found, skip 
   return
  }
  position.unstakedLpAmount = position.unstakedLpAmount.minus(
    event.params.liquidity
  )
  savePosition(event, position)
  let userPool = UserPool.load(position.userPool!)!
  userPool.unstakedLpAmount = position.unstakedLpAmount
  saveUserPool(event, userPool)
}

export function handleTransfer(event: Transfer): void {
  let position = Position.load(event.params.tokenId.toString())
  if (!position) {
    if (IsMintToTransferTx(event)) {
      position = new Position(event.params.tokenId.toString())
      position.unstakedLpAmount = BigInt.zero()
      position.createdAt = getOrCreateBlockInfo(event).id
      let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
      let ownerPool = getOrCreateUserPoolEntity(
        event,
        event.params.to.toHexString(),
        poolId
      )
      ownerPool.unstakedLpAmount = BigInt.zero()
      saveUserPool(event, ownerPool)
      position.userPool = ownerPool.id
      savePosition(event, position)
    } else {
      // If the position is not found and the transaction is not a mint to transfer, then this transfer is not to be handled
      return
    }
  }
  if (
    event.params.from.toHexString() == AerodromeCLGaugeAddress ||
    event.params.to.toHexString() == AerodromeCLGaugeAddress
  ) {
    log.info(
      "transfer event from or to AerodromeCLGaugeAddress, txHash: {} ,already handled on deposit or withdraw events",
      [event.transaction.hash.toHexString()]
    )
    return
  }
  log.info("position created from IncreaseLiquidity, txHash: {}", [
    event.transaction.hash.toHexString(),
  ])
  let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
  let userPool = getOrCreateUserPoolEntity(
    event,
    event.params.to.toHexString(),
    poolId
  )
  // position.unstakedLpAmount value is updated in the handleIncreaseLiquidity function
  log.info("position.unstakedLpAmount: {} txHash: {}", [
    position.unstakedLpAmount.toString(),
    event.transaction.hash.toHexString(),
  ])
  userPool.unstakedLpAmount = position.unstakedLpAmount
  saveUserPool(event, userPool)
  position.userPool = userPool.id
  savePosition(event, position)
}
