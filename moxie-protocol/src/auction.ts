import { BigInt, BigDecimal, Bytes, Address } from "@graphprotocol/graph-ts"
import { NewAuction, ClaimedFromOrder, AuctionCleared, EasyAuction, UserRegistration } from "../generated/EasyAuction/EasyAuction"
import { Auction, AuctionOrder, AuctionUser, Order } from "../generated/schema"
import { getOrCreateSubjectToken, getTxEntityId, getOrCreateSummary, getOrCreateBlockInfo, decodeOrder, AuctionOrderClass, getOrCreatePortfolio, savePortfolio, getOrCreateUser, saveUser, saveSubjectTokenAndSnapshots } from "./utils"
import { ORDER_TYPE_AUCTION } from "./constants"

class AuctionAndOrder {
  auction: Auction
  order: AuctionOrder
  user: AuctionUser
  constructor(auction: Auction, order: AuctionOrder, user: AuctionUser) {
    this.auction = auction
    this.order = order
    this.user = user
  }
}
export function enrichAuctionOrderWithRewardAndRefund(event: ClaimedFromOrder): AuctionAndOrder {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + event.params.auctionId.toString())
  }
  let user = AuctionUser.load(event.params.userId.toString())
  if (!user) {
    throw new Error("User not loaded: userId : " + event.params.userId.toString())
  }
  // calculate refund and reward
  let order = new AuctionOrder(getTxEntityId(event))
  order.auction = auction.id
  order.buyAmount = event.params.buyAmount
  order.sellAmount = event.params.sellAmount
  order.user = user.id
  let auctionOrderObj = new AuctionOrderClass(event.params.userId, order.buyAmount, order.sellAmount)
  let clearingOrderObj = new AuctionOrderClass(auction.clearingUserId, auction.clearingBuyAmount, auction.clearingSellAmount)

  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()

  let priceNumerator = auction.clearingBuyAmount
  let priceDenominator = auction.clearingSellAmount

  if (auction.minFundingThresholdNotReached) {
    sumBiddingTokenAmount = order.sellAmount
  } else {
    if (auction.clearingBuyAmount.equals(order.buyAmount) && auction.clearingSellAmount.equals(order.sellAmount) && auction.clearingUserId.equals(event.params.userId)) {
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
  return new AuctionAndOrder(auction, order, user)
}
export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let blockInfo = getOrCreateBlockInfo(event.block)
  let auctionAndOrder = enrichAuctionOrderWithRewardAndRefund(event)
  if (!auctionAndOrder.auction.subjectToken) {
    throw new Error("Subject token not exist, txHash: " + event.transaction.hash.toHexString())
  }
  let subjectTokenAddress = Address.fromString(auctionAndOrder.auction.subjectToken!)
  let protocolTokenAmount = auctionAndOrder.order.sellAmount.minus(auctionAndOrder.order.refund)
  let subjectAmount = auctionAndOrder.order.reward
  let price = protocolTokenAmount.divDecimal(subjectAmount.toBigDecimal())
  let order = new Order(getTxEntityId(event))
  order.protocolToken = auctionAndOrder.auction.protocolToken
  order.protocolTokenAmount = protocolTokenAmount
  order.protocolTokenInvested = new BigDecimal(protocolTokenAmount)
  order.subjectToken = auctionAndOrder.auction.subjectToken!
  order.subjectAmount = subjectAmount

  order.orderType = ORDER_TYPE_AUCTION
  order.user = auctionAndOrder.user.id
  order.subjectFee = BigInt.zero()
  order.protocolFee = BigInt.zero()
  order.price = price
  order.blockInfo = blockInfo.id

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(Address.fromString(auctionAndOrder.user.id), subjectTokenAddress, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(protocolTokenAmount)
  portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(subjectAmount)

  savePortfolio(portfolio, event.block)
  order.portfolio = portfolio.id
  order.save()
  let user = getOrCreateUser(Address.fromString(auctionAndOrder.user.id), event.block)
  // increasing user protocol token spent
  user.buyVolume = user.buyVolume.plus(protocolTokenAmount)
  // increasing user investment
  user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  saveUser(user, event.block)

  const summary = getOrCreateSummary()
  summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  summary.numberOfBuyOrders = summary.numberOfBuyOrders.plus(BigInt.fromI32(1))
  summary.totalBuyVolume = summary.totalBuyVolume.plus(protocolTokenAmount)
  summary.save()

  let subjectToken = getOrCreateSubjectToken(subjectTokenAddress, null, event.block)
  subjectToken.buySideVolume = subjectToken.buySideVolume.plus(protocolTokenAmount)
  subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  subjectToken.currentPriceinMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(protocolTokenAmount)
  saveSubjectTokenAndSnapshots(subjectToken, event.block)
}

export function handleNewAuction(event: NewAuction): void {
  // minFundingThresholdNotReached = event.params.minFundingThresholdNotReached need to see
  let auction = new Auction(event.params.auctionId.toString())
  auction.minFundingThreshold = event.params.minFundingThreshold
  auction.auctionEndDate = event.params.auctionEndDate
  auction.protocolToken = event.params._biddingToken
  auction.subjectToken = getOrCreateSubjectToken(event.params._auctioningToken, auction, event.block).id
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

export function handleUserRegistration(event: UserRegistration): void {
  let user = new AuctionUser(event.params.userId.toString())
  user.userAddress = event.params.user
  user.save()
}
