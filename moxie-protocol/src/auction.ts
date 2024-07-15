import { NewAuction, NewSellOrder, ClaimedFromOrder, CancellationSellOrder } from "../generated/EasyAuction/EasyAuction"
import { AuctionCancellationSellOrder, AuctionClaimedFromOrder, AuctioningToken, AuctionNewSellOrder } from "../generated/schema"
import { getOrCreateAuctionTransferId, getOrCreateSubject, getTxEntityId } from "./utils"

export function handleNewSellOrder(event: NewSellOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let newSellOrder = new AuctionNewSellOrder(getTxEntityId(event))
  newSellOrder.subject = auctioningToken.subject
  newSellOrder.txHash = getOrCreateAuctionTransferId(event.transaction.hash)
  newSellOrder.userId = event.params.userId
  newSellOrder.buyAmount = event.params.buyAmount
  newSellOrder.sellAmount = event.params.sellAmount
  newSellOrder.save()
}

export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let claimedFromOrder = new AuctionClaimedFromOrder(getTxEntityId(event))
  claimedFromOrder.subject = auctioningToken.subject
  claimedFromOrder.txHash = getOrCreateAuctionTransferId(event.transaction.hash)

  claimedFromOrder.userId = event.params.userId
  claimedFromOrder.buyAmount = event.params.buyAmount
  claimedFromOrder.sellAmount = event.params.sellAmount
  claimedFromOrder.save()
}

export function handleCancellationSellOrder(event: CancellationSellOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let cancellationSellOrder = new AuctionCancellationSellOrder(getTxEntityId(event))
  cancellationSellOrder.txHash = getOrCreateAuctionTransferId(event.transaction.hash)

  cancellationSellOrder.subject = auctioningToken.subject
  cancellationSellOrder.userId = event.params.userId
  cancellationSellOrder.buyAmount = event.params.buyAmount
  cancellationSellOrder.sellAmount = event.params.sellAmount
  cancellationSellOrder.save()
}

export function handleNewAuction(event: NewAuction): void {
  let auctioningToken = new AuctioningToken(event.params.auctionId.toString())
  auctioningToken.subject = getOrCreateSubject(event.params._auctioningToken, event.block).id
  auctioningToken.save()
}

export function loadAuctioningToken(auctionId: string): AuctioningToken {
  let auctioningToken = AuctioningToken.load(auctionId)
  if (auctioningToken == null) {
    throw new Error("Auctioning token not found for auctionId: " + auctionId)
  }
  return auctioningToken as AuctioningToken
}
