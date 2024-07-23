import { BigInt, BigDecimal, Bytes, Address, log } from "@graphprotocol/graph-ts"
import { NewAuction, ClaimedFromOrder, AuctionCleared, EasyAuction, UserRegistration } from "../generated/EasyAuction/EasyAuction"
import { Auction, AuctionUser, Order } from "../generated/schema"
import { getOrCreateSubjectToken, getTxEntityId, getOrCreateSummary, getOrCreateBlockInfo, decodeOrder, AuctionOrderClass, getOrCreatePortfolio, savePortfolio, getOrCreateUser, saveUser, saveSubjectTokenAndSnapshots, Price } from "./utils"
import { ORDER_TYPE_AUCTION } from "./constants"

class AuctionAndOrder {
  auction: Auction
  user: AuctionUser
  sellAmount: BigInt
  reward: BigInt
  refund: BigInt
  constructor(auction: Auction, user: AuctionUser, sellAmount: BigInt, reward: BigInt, refund: BigInt) {
    this.auction = auction
    this.user = user
    this.sellAmount = sellAmount
    this.reward = reward
    this.refund = refund
  }
}
export function enrichAuctionOrderWithRewardAndRefund(event: ClaimedFromOrder): AuctionAndOrder {
  let auctionId = event.params.auctionId
  let userId = event.params.userId
  let buyAmount = event.params.buyAmount
  let sellAmount = event.params.sellAmount
  let auction = Auction.load(auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + auctionId.toString())
  }
  let user = AuctionUser.load(userId.toString())
  if (!user) {
    throw new Error("User not loaded: userId : " + userId.toString())
  }
  // calculate refund and reward

  let auctionOrderObj = new AuctionOrderClass(userId, buyAmount, sellAmount)
  let clearingOrderObj = new AuctionOrderClass(auction.clearingUserId, auction.clearingBuyAmount, auction.clearingSellAmount)

  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()

  let priceNumerator = auction.clearingBuyAmount
  let priceDenominator = auction.clearingSellAmount

  if (auction.minFundingThresholdNotReached) {
    sumBiddingTokenAmount = sellAmount
  } else {
    if (auction.clearingBuyAmount.equals(buyAmount) && auction.clearingSellAmount.equals(sellAmount) && auction.clearingUserId.equals(userId)) {
      sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(auction.volumeClearingPriceOrder).times(priceNumerator).div(priceDenominator)
      sumBiddingTokenAmount = sumBiddingTokenAmount.plus(sellAmount.minus(auction.volumeClearingPriceOrder))
    } else {
      if (auctionOrderObj.smallerThan(clearingOrderObj)) {
        sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(sellAmount).times(priceNumerator).div(priceDenominator)
      } else {
        sumBiddingTokenAmount = sumBiddingTokenAmount.plus(sellAmount)
      }
    }
  }
  let reward = sumAuctioningTokenAmount // subject token
  let refund = sumBiddingTokenAmount // moxie
  return new AuctionAndOrder(auction, user, sellAmount, reward, refund)
}
export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let blockInfo = getOrCreateBlockInfo(event.block)
  let auctionAndOrder = enrichAuctionOrderWithRewardAndRefund(event)
  if (!auctionAndOrder.auction.subjectToken) {
    throw new Error("Subject token not exist, txHash: " + event.transaction.hash.toHexString())
  }
  let subjectTokenAddress = Address.fromString(auctionAndOrder.auction.subjectToken!)
  let protocolTokenAmount = auctionAndOrder.sellAmount.minus(auctionAndOrder.refund)
  let subjectAmount = auctionAndOrder.reward
  if (subjectAmount.equals(BigInt.zero())) {
    log.warning("Subject amount is zero, txHash: {}", [event.transaction.hash.toHexString()])
    return
  }
  let price = new Price(protocolTokenAmount, subjectAmount)
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
  order.price = price.price
  order.blockInfo = blockInfo.id

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(Address.fromBytes(auctionAndOrder.user.userAddress), subjectTokenAddress, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(protocolTokenAmount)
  portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(subjectAmount)

  savePortfolio(portfolio, event.block)
  order.portfolio = portfolio.id
  order.save()
  let user = getOrCreateUser(Address.fromBytes(auctionAndOrder.user.userAddress), event.block)
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

  subjectToken.currentPriceInMoxie = price.price
  subjectToken.currentPriceInWeiInMoxie = price.priceInWei
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
  auction.endTxHash = event.transaction.hash
  auction.endBlockInfo = getOrCreateBlockInfo(event.block).id
  auction.save()
}

export function handleUserRegistration(event: UserRegistration): void {
  let user = new AuctionUser(event.params.userId.toString())
  user.userAddress = event.params.user
  user.save()
}
