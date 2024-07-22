import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts"
import { NewAuction, ClaimedFromOrder, AuctionCleared, EasyAuction } from "../generated/EasyAuction/EasyAuction"
import { Auction, AuctionOrder, Order } from "../generated/schema"
import { getOrCreateSubjectToken, getTxEntityId, getOrCreateSummary, getOrCreateBlockInfo, decodeOrder, AuctionOrderClass } from "./utils"

export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + event.params.auctionId.toString())
  }
  // calculate refund and reward
  let order = new AuctionOrder(getTxEntityId(event))
  order.auction = auction.id
  order.buyAmount = event.params.buyAmount
  order.sellAmount = event.params.sellAmount
  order.userId = event.params.userId
  let auctionOrderObj = new AuctionOrderClass(order.userId, order.buyAmount, order.sellAmount)
  let clearingOrderObj = new AuctionOrderClass(auction.clearingUserId, auction.clearingBuyAmount, auction.clearingSellAmount)

  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()

  let priceNumerator = auction.clearingBuyAmount
  let priceDenominator = auction.clearingSellAmount

  if (auction.minFundingThresholdNotReached) {
    sumBiddingTokenAmount = order.sellAmount
  } else {
    if (auction.clearingBuyAmount.equals(order.buyAmount) && auction.clearingSellAmount.equals(order.sellAmount) && auction.clearingUserId.equals(order.userId)) {
      sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(auction.volumeClearingPriceOrder).times(priceNumerator).div(priceDenominator)
      sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount.minus(auction.volumeClearingPriceOrder))
    } else {
      if (auctionOrderObj.smallerThan(clearingOrderObj)) {
        sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(order.sellAmount).times(priceNumerator).div(priceDenominator)
      } else {
        sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount)
      }
    }
  }
  order.reward = sumAuctioningTokenAmount // subject token
  order.refund = sumBiddingTokenAmount // moxie
  order.save()
}

export function handleNewAuction(event: NewAuction): void {
  // minFundingThresholdNotReached = event.params.minFundingThresholdNotReached need to see
  let auction = new Auction(event.params.auctionId.toString())
  auction.minFundingThreshold = event.params.minFundingThreshold
  auction.auctionEndDate = event.params.auctionEndDate

  auction.clearingUserId = BigInt.zero()
  auction.clearingBuyAmount = BigInt.zero()
  auction.clearingSellAmount = BigInt.zero()
  auction.clearingPrice = BigDecimal.zero()
  auction.amountRaised = BigInt.zero()
  auction.subjectFee = BigInt.zero()
  auction.protocolFee = BigInt.zero()
  auction.startTxHash = event.transaction.hash
  auction.startBlockInfo = getOrCreateBlockInfo(event.block).id
  auction.minFundingThresholdNotReached = false
  auction.volumeClearingPriceOrder = BigInt.zero()
  auction.save()
}

export function handleAuctionCleared(event: AuctionCleared): void {
  let easyAuction = EasyAuction.bind(event.address)

  let auctionDetails = easyAuction.auctionData(event.params.auctionId)
  let decodedOrder = decodeOrder(event.params.clearingPriceOrder)

  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + event.params.auctionId.toString())
  }
  auction.clearingUserId = decodedOrder.userId
  auction.clearingBuyAmount = decodedOrder.buyAmount
  auction.clearingSellAmount = decodedOrder.sellAmount
  let currentBidSum = event.params.soldBiddingTokens
  if (auction.minFundingThreshold.gt(currentBidSum)) {
    auction.minFundingThresholdNotReached = true
  }
  auction.volumeClearingPriceOrder = auctionDetails.value9
  auction.save()
}
