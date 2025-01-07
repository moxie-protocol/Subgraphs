import { V3NftMint, V3NftTokenIdToLiquidity } from "../generated/schema"
import { getOrCreatePoolEntity, getOrCreateUserEntity, getOrCreateUserPoolEntity, getV3NftIdentifier, handleTransferEvents } from "./utils"
import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { Transfer as NftTransfer, IncreaseLiquidity, DecreaseLiquidity } from "../generated/templates/NonfungiblePositionManager/NonfungiblePositionManager"
import { NFT_MANAGER_POOL_MAP } from "./constants"

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
 log.info("Handling IncreaseLiquidity event for tokenId: {} txHash: {}", [event.params.tokenId.toString(), event.transaction.hash.toHexString()])
 // saving tokenId to liquidity mapping for handling future transfer events
 let entityId = getV3NftIdentifier(event.transaction.hash, event.params.liquidity, BigInt.zero(), BigInt.zero())
 let entity = V3NftMint.load(entityId)
 if (entity) {
  // means nft is just getting minted
  log.info("Minting liquidity for tokenId: {}, liquidity: {}", [event.params.tokenId.toString(), event.params.liquidity.toString()])
  let tokenIdToLiquidity = new V3NftTokenIdToLiquidity(event.params.tokenId.toString())
  tokenIdToLiquidity.liquidity = event.params.liquidity
  tokenIdToLiquidity.save()
  return
 }

 // handling increase liquidity event for already minted nft
 let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(event.params.tokenId.toString())
 if (!tokenIdToLiquidity) {
  log.info("Not a IncreaseLiquidity event to be handled", [])
  return
 }
 tokenIdToLiquidity.liquidity = tokenIdToLiquidity.liquidity.plus(event.params.liquidity)
 log.info("Increasing liquidity for tokenId: {}, liquidity: {} added {}", [event.params.tokenId.toString(), tokenIdToLiquidity.liquidity.toString(), event.params.liquidity.toString()])
 tokenIdToLiquidity.save()
}


export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
 log.info("Handling DecreaseLiquidity event for tokenId: {} txHash: {}", [event.params.tokenId.toString(), event.transaction.hash.toHexString()])
 let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(event.params.tokenId.toString())
 if (!tokenIdToLiquidity) {
  log.info("Not a DecreaseLiquidity event to be handled", [])
  return
 }
 tokenIdToLiquidity.liquidity = tokenIdToLiquidity.liquidity.minus(event.params.liquidity)
 log.info("Decreasing liquidity for tokenId: {}, liquidity: {} removed {}", [event.params.tokenId.toString(), tokenIdToLiquidity.liquidity.toString(), event.params.liquidity.toString()])
 tokenIdToLiquidity.save()
}

export function handleTransfer3(event: NftTransfer): void {
 log.info("Handling Transfer event for tokenId: {} txHash: {}", [event.params.tokenId.toString(), event.transaction.hash.toHexString()])
 let tokenIdToLiquidity = V3NftTokenIdToLiquidity.load(event.params.tokenId.toString())
 if (!tokenIdToLiquidity) {
  log.info("Not a Transfer event to be handled", [])
  return
 }
 if (event.params.from == Address.zero()) {
  log.info("Transfer from is zero address, already handled", [])
  return
 }
 if (event.params.to == Address.zero()) {
  log.info("Transfer to is zero address, already handled", [])
  return
 }
 let poolId = NFT_MANAGER_POOL_MAP.mustGet(event.address.toHexString())
 if (poolId != null) {
  let poolAddress = poolId.toString()
  handleTransferEvents(event, event.params.from, event.params.to, tokenIdToLiquidity.liquidity, poolAddress)
 } else {
  // this should never happen
  throw new Error("Pool not found for NFTManager address: " + event.address.toHexString())
 }
}