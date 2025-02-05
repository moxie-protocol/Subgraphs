import {
  Pool,
  UserPool,
  V3NftMint,
  V3NftMintViaTransfer,
  V3NftTokenIdToLiquidity,
} from "../generated/schema"
import {
  getOrCreateBlockInfo,
  getOrCreatePoolEntity,
  getOrCreateUserEntity,
  getOrCreateUserPoolEntity,
  getV3NftIdentifier,
  handleTransferEvents,
  savePool,
  saveUserPool,
} from "./utils"
import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  Transfer as NftTransfer,
  IncreaseLiquidity,
  DecreaseLiquidity,
} from "../generated/templates/NonfungiblePositionManager/NonfungiblePositionManager"
import { AerodromeCLGaugeAddress, NFT_MANAGER_POOL_MAP } from "./constants"

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  let entityId = getV3NftIdentifier(
    event.transaction.hash,
    event.params.liquidity,
    event.params.amount0,
    event.params.amount1
  )
  let tokenIdToLiquidity: V3NftTokenIdToLiquidity | null = null
  let entity = V3NftMint.load(entityId)
  if (entity) {
    let tokenIdToLiquidity = new V3NftTokenIdToLiquidity(
      event.params.tokenId.toString()
    )
    tokenIdToLiquidity.liquidity = event.params.liquidity
    tokenIdToLiquidity.save()
  } else {
    // handling increase liquidity event for already minted nft
    tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(
      event.params.tokenId.toString()
    )
    if (!tokenIdToLiquidity) {
      log.info("Not a IncreaseLiquidity event to be handled", [])
      return
    }
    tokenIdToLiquidity.liquidity = tokenIdToLiquidity.liquidity.plus(
      event.params.liquidity
    )
    log.info("Increasing liquidity for tokenId: {}, liquidity: {} added {}", [
      event.params.tokenId.toString(),
      tokenIdToLiquidity.liquidity.toString(),
      event.params.liquidity.toString(),
    ])
    tokenIdToLiquidity.save()
  }
  if (tokenIdToLiquidity != null) {
    let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
    let pool = Pool.load(poolId.toString())
    if (!pool) {
      throw new Error("Pool not found for poolId: " + poolId.toString())
    }
    pool.totalSupply = pool.totalSupply.plus(event.params.liquidity)
    savePool(event, pool)
    if (tokenIdToLiquidity.ownerPool != null) {
      let ownerPool = UserPool.load(tokenIdToLiquidity.ownerPool!)
      if (!ownerPool) {
        throw new Error(
          "OwnerPool not found for tokenId: " +
            event.params.tokenId.toString() +
            "txHash: " +
            event.transaction.hash.toHexString()
        )
      }
      ownerPool.unstakedLpAmount = ownerPool.unstakedLpAmount.plus(
        event.params.liquidity
      )
      saveUserPool(event, ownerPool, false)
    }
  }
}

export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
  let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(
    event.params.tokenId.toString()
  )
  if (!tokenIdToLiquidity) {
    log.info("Not a DecreaseLiquidity event to be handled", [])
    return
  }

  if (tokenIdToLiquidity.ownerPool != null) {
    let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
    let pool = Pool.load(poolId.toString())
    if (!pool) {
      throw new Error("Pool not found for poolId: " + poolId.toString())
    }

    if (tokenIdToLiquidity.liquidity.lt(event.params.liquidity)) {
      pool.totalSupply = pool.totalSupply.minus(tokenIdToLiquidity.liquidity)
      tokenIdToLiquidity.liquidity = BigInt.zero()
      log.info(
        "Liquidity is less than the liquidity to be removed for tokenId: {}, liquidity: {} txHash: {}",
        [
          event.params.tokenId.toString(),
          tokenIdToLiquidity.liquidity.toString(),
          event.transaction.hash.toHexString(),
        ]
      )
    } else {
      pool.totalSupply = pool.totalSupply.minus(event.params.liquidity)
      tokenIdToLiquidity.liquidity = tokenIdToLiquidity.liquidity.minus(
        event.params.liquidity
      )
      log.info(
        "Decreasing liquidity tokenId: {}, liquidity: {} removed {} txHash: {}",
        [
          event.params.tokenId.toString(),
          tokenIdToLiquidity.liquidity.toString(),
          event.params.liquidity.toString(),
          event.transaction.hash.toHexString(),
        ]
      )
    }
    tokenIdToLiquidity.save()
    savePool(event, pool)
    let ownerPool = UserPool.load(tokenIdToLiquidity.ownerPool!)
    if (!ownerPool) {
      throw new Error(
        "OwnerPool not found for tokenId: " +
          event.params.tokenId.toString() +
          "txHash: " +
          event.transaction.hash.toHexString()
      )
    }
    ownerPool.unstakedLpAmount = ownerPool.unstakedLpAmount.minus(
      event.params.liquidity
    )
    saveUserPool(event, ownerPool, false)
  }
}

export function handleTransfer3(event: NftTransfer): void {
  log.info("Handling Transfer event for tokenId: {} txHash: {}", [
    event.params.tokenId.toString(),
    event.transaction.hash.toHexString(),
  ])
  let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(
    event.params.tokenId.toString()
  )
  if (!tokenIdToLiquidity) {
    let txEntity = V3NftMintViaTransfer.load(
      event.transaction.hash
        .toHexString()
        .concat("-")
        .concat(event.logIndex.minus(BigInt.fromI32(1)).toString())
    )
    if (txEntity) {
      tokenIdToLiquidity = new V3NftTokenIdToLiquidity(
        event.params.tokenId.toString()
      )
      tokenIdToLiquidity.liquidity = BigInt.zero()
    } else {
      log.info("Not a Transfer event to be handled", [])
      return
    }
  }
  if (event.params.from == Address.zero()) {
    log.info("Handling minting of tokenId: {} txHash: {}", [
      event.params.tokenId.toString(),
      event.transaction.hash.toHexString(),
    ])
    let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
    if (poolId != null) {
      let poolAddress = poolId.toString()
      let ownerPool = getOrCreateUserPoolEntity(
        event,
        event.params.to.toHexString(),
        poolAddress
      )
      ownerPool.updatedAt = getOrCreateBlockInfo(event).id
      ownerPool.save()
      log.info("Updating ownerPool for tokenId: {} to {}", [
        event.params.tokenId.toString(),
        ownerPool.id,
      ])
      tokenIdToLiquidity.ownerPool = ownerPool.id
      log.info("Handling minting of tokenId: {} ownerPool: {} txHash: {} 2", [
        event.params.tokenId.toString(),
        ownerPool.id,
        event.transaction.hash.toHexString(),
      ])
      tokenIdToLiquidity.save()
    }
    return
  }
  if (event.params.to == Address.zero()) {
    log.info("Transfer to is zero address, already handled", [])
    return
  }
  let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let poolAddress = poolId.toString()
    handleTransferEvents(
      event,
      event.params.from,
      event.params.to,
      tokenIdToLiquidity.liquidity,
      poolAddress
    )
    let toAddressIsPool =
      event.params.to.toHexString().toLowerCase() == AerodromeCLGaugeAddress
    let fromAddressIsPool =
      event.params.from.toHexString().toLowerCase() == AerodromeCLGaugeAddress

    log.info("tokenId: {} from: {} to: {} fromPool: {} toPool: {}", [
      event.params.tokenId.toString(),
      event.params.from.toHexString(),
      event.params.to.toHexString(),
      fromAddressIsPool.toString(),
      toAddressIsPool.toString(),
    ])
    if (toAddressIsPool || fromAddressIsPool) {
      log.info(
        "Transfer to or from pool, not handling tokenIdToLiquidity ownerPool change",
        []
      )
      return
    }
    let ownerPool = getOrCreateUserPoolEntity(
      event,
      event.params.to.toHexString(),
      poolAddress
    )
    ownerPool.updatedAt = getOrCreateBlockInfo(event).id
    ownerPool.save()
    log.info("Updating ownerPool for tokenId: {} to {}", [
      event.params.tokenId.toString(),
      ownerPool.id,
    ])
    tokenIdToLiquidity.ownerPool = ownerPool.id
    tokenIdToLiquidity.save()
  } else {
    // this should never happen
    throw new Error(
      "Pool not found for NFTManager address: " + event.address.toHexString()
    )
  }
}
