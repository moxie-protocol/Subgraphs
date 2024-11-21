import { BigInt, BigDecimal, Bytes, Address, log } from "@graphprotocol/graph-ts"
import { NewAuction, ClaimedFromOrder, AuctionCleared, EasyAuction, UserRegistration } from "../generated/EasyAuction/EasyAuction"
import { Auction, AuctionUser, Order } from "../generated/schema"
import { getOrCreateSubjectToken, getTxEntityId, getOrCreateSummary, getOrCreateBlockInfo, decodeOrder, AuctionOrderClass, getOrCreatePortfolio, savePortfolio, getOrCreateUser, saveUser, CalculatePrice, loadAuction, saveSubjectToken, isBlacklistedAuction, isBlacklistedSubjectTokenAddress } from "./utils"
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
  let auction = loadAuction(auctionId)
  let user = AuctionUser.load(userId.toString())
  if (!user) {
    throw new Error("AuctionUser not loaded: userId : " + userId.toString())
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
  if (isBlacklistedAuction(event.params.auctionId.toString())) {
    return
  }
  let blockInfo = getOrCreateBlockInfo(event.block)
  let auctionAndOrder = enrichAuctionOrderWithRewardAndRefund(event)
  if (!auctionAndOrder.auction.subjectToken) {
    throw new Error("Subject token not exist, txHash: " + event.transaction.hash.toHexString())
  }
  let subjectTokenAddress = Address.fromString(auctionAndOrder.auction.subjectToken!)
  let userAddress = Address.fromBytes(auctionAndOrder.user.userAddress)
  let protocolTokenAmount = auctionAndOrder.sellAmount.minus(auctionAndOrder.refund)
  let subjectAmount = auctionAndOrder.reward
  if (subjectAmount.equals(BigInt.zero())) {
    log.warning("Subject amount is zero, txHash: {}", [event.transaction.hash.toHexString()])
    return
  }
  let subjectToken = getOrCreateSubjectToken(subjectTokenAddress, event.block)
  let calculatedPrice = new CalculatePrice(subjectToken.reserve, subjectToken.totalSupply, subjectToken.reserveRatio)

  let user = getOrCreateUser(userAddress, event.block)
  user.buyVolume = user.buyVolume.plus(protocolTokenAmount)
  user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  saveUser(user, event.block)

  const summary = getOrCreateSummary()
  summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  summary.numberOfBuyOrders = summary.numberOfBuyOrders.plus(BigInt.fromI32(1))
  summary.totalBuyVolume = summary.totalBuyVolume.plus(protocolTokenAmount)
  summary.numberOfAuctionOrders = summary.numberOfAuctionOrders.plus(BigInt.fromI32(1))
  summary.save()

  subjectToken.buySideVolume = subjectToken.buySideVolume.plus(protocolTokenAmount)
  subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(protocolTokenAmount)
  saveSubjectToken(subjectToken, event.block, true)

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(userAddress, subjectTokenAddress, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(protocolTokenAmount)
  portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(subjectAmount)
  savePortfolio(portfolio, event.block)


  let order = new Order(getTxEntityId(event))
  order.protocolToken = auctionAndOrder.auction.protocolToken
  order.protocolTokenAmount = protocolTokenAmount
  order.protocolTokenInvested = new BigDecimal(protocolTokenAmount)
  order.subjectToken = auctionAndOrder.auction.subjectToken!
  order.subjectAmount = subjectAmount
  order.orderType = ORDER_TYPE_AUCTION
  order.user = user.id
  order.subjectFee = BigInt.zero()
  order.protocolFee = BigInt.zero()
  order.price = calculatedPrice.price
  order.blockInfo = blockInfo.id
  order.portfolio = portfolio.id
  order.blockNumber = event.block.number
  order.save()
}

export function handleNewAuction(event: NewAuction): void {
  if (isBlacklistedAuction(event.params.auctionId.toString())) {
    return
  }

  let subjectToken = getOrCreateSubjectToken(event.params._auctioningToken, event.block)
  let auction = new Auction(event.params.auctionId.toString())
  auction.minFundingThreshold = event.params.minFundingThreshold
  auction.auctionEndDate = event.params.auctionEndDate
  auction.protocolToken = event.params._biddingToken
  auction.subjectToken = subjectToken.id
  auction.clearingUserId = BigInt.zero()
  auction.clearingBuyAmount = BigInt.zero()
  auction.clearingSellAmount = BigInt.zero()
  auction.amountRaised = BigInt.zero()
  auction.subjectFee = BigInt.zero()
  auction.protocolFee = BigInt.zero()
  auction.startTxHash = event.transaction.hash
  auction.startBlockInfo = getOrCreateBlockInfo(event.block).id
  auction.startBlockNumber = event.block.number
  auction.minFundingThresholdNotReached = false
  auction.volumeClearingPriceOrder = BigInt.zero()
  auction.save()

  subjectToken.auction = auction.id
  subjectToken.save()
}

export function handleAuctionCleared(event: AuctionCleared): void {
  if (isBlacklistedAuction(event.params.auctionId.toString())) {
    return
  }

  let easyAuction = EasyAuction.bind(event.address)

  let auctionDetails = easyAuction.auctionData(event.params.auctionId)
  let decodedOrder = decodeOrder(event.params.clearingPriceOrder)

  let auction = loadAuction(event.params.auctionId)
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
