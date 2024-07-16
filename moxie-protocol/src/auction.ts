import { NewAuction, NewSellOrder, ClaimedFromOrder, CancellationSellOrder } from "../generated/EasyAuction/EasyAuction"
import { AuctionCancellationSellOrderTx, AuctionClaimedFromOrderTx, AuctioningToken, AuctionNewSellOrderTx } from "../generated/schema"
import { getOrCreateTransactionId, getOrCreateSubjectToken, getTxEntityId } from "./utils"

export function handleNewSellOrder(event: NewSellOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let newSellOrder = new AuctionNewSellOrderTx(getTxEntityId(event))
  newSellOrder.subjectToken = auctioningToken.subjectToken
  newSellOrder.txHash = event.transaction.hash
  newSellOrder.txn = getOrCreateTransactionId(event.transaction.hash)
  newSellOrder.userId = event.params.userId
  newSellOrder.buyAmount = event.params.buyAmount
  newSellOrder.sellAmount = event.params.sellAmount
  newSellOrder.save()
}

export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let claimedFromOrder = new AuctionClaimedFromOrderTx(getTxEntityId(event))
  claimedFromOrder.subjectToken = auctioningToken.subjectToken
  claimedFromOrder.txn = getOrCreateTransactionId(event.transaction.hash)
  claimedFromOrder.txHash = event.transaction.hash

  claimedFromOrder.userId = event.params.userId
  claimedFromOrder.buyAmount = event.params.buyAmount
  claimedFromOrder.sellAmount = event.params.sellAmount
  claimedFromOrder.save()
}

export function handleCancellationSellOrder(event: CancellationSellOrder): void {
  let auctioningToken = loadAuctioningToken(event.params.auctionId.toString())
  let cancellationSellOrder = new AuctionCancellationSellOrderTx(getTxEntityId(event))
  cancellationSellOrder.txn = getOrCreateTransactionId(event.transaction.hash)
  cancellationSellOrder.txHash = event.transaction.hash

  cancellationSellOrder.subjectToken = auctioningToken.subjectToken
  cancellationSellOrder.userId = event.params.userId
  cancellationSellOrder.buyAmount = event.params.buyAmount
  cancellationSellOrder.sellAmount = event.params.sellAmount
  cancellationSellOrder.save()
}

export function handleNewAuction(event: NewAuction): void {
  let auctioningToken = new AuctioningToken(event.params.auctionId.toString())
  auctioningToken.subjectToken = getOrCreateSubjectToken(event.params._auctioningToken, event.block).id
  auctioningToken.save()
}

export function loadAuctioningToken(auctionId: string): AuctioningToken {
  let auctioningToken = AuctioningToken.load(auctionId)
  if (auctioningToken == null) {
    throw new Error("Auctioning token not found for auctionId: " + auctionId)
  }
  return auctioningToken as AuctioningToken
}
