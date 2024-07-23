import { BigInt, BigDecimal, Bytes, Address, log } from "@graphprotocol/graph-ts"
import { NewAuction, ClaimedFromOrder, AuctionCleared, EasyAuction, UserRegistration } from "../generated/EasyAuction/EasyAuction"
import { Auction, AuctionUser } from "../generated/schema"
import { getOrCreateSubjectToken, getOrCreateSummary, getOrCreateBlockInfo, decodeOrder, AuctionOrderClass, getOrCreatePortfolio, savePortfolio, getOrCreateUser, saveUser, saveSubjectToken } from "./utils"

class AuctionAndUser {
  auction: Auction
  user: AuctionUser
  reward: BigInt
  refund: BigInt
  constructor(auction: Auction, user: AuctionUser, reward: BigInt, refund: BigInt) {
    this.auction = auction
    this.user = user
    this.reward = reward
    this.refund = refund
  }
}
export function enrichAuctionOrderWithRewardAndRefund(event: ClaimedFromOrder): AuctionAndUser {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + event.params.auctionId.toString())
  }
  let user = AuctionUser.load(event.params.userId.toString())
  if (!user) {
    throw new Error("User not loaded: userId : " + event.params.userId.toString())
  }
  // calculate refund and reward

  let buyAmount = event.params.buyAmount
  let sellAmount = event.params.sellAmount
  let auctionOrderObj = new AuctionOrderClass(event.params.userId, buyAmount, sellAmount)
  let clearingOrderObj = new AuctionOrderClass(auction.clearingUserId, auction.clearingBuyAmount, auction.clearingSellAmount)

  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()

  let priceNumerator = auction.clearingBuyAmount
  let priceDenominator = auction.clearingSellAmount

  if (auction.minFundingThresholdNotReached) {
    sumBiddingTokenAmount = sellAmount
  } else {
    if (auction.clearingBuyAmount.equals(buyAmount) && auction.clearingSellAmount.equals(sellAmount) && auction.clearingUserId.equals(event.params.userId)) {
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
  return new AuctionAndUser(auction, user, reward, refund)
}
export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let buyAmount = event.params.buyAmount
  let sellAmount = event.params.sellAmount
  let blockInfo = getOrCreateBlockInfo(event.block)
  let auctionAndOrder = enrichAuctionOrderWithRewardAndRefund(event)
  if (!auctionAndOrder.auction.subjectToken) {
    throw new Error("Subject token not exist, txHash: " + event.transaction.hash.toHexString())
  }
  let subjectTokenAddress = Address.fromString(auctionAndOrder.auction.subjectToken!)
  let protocolTokenAmount = sellAmount.minus(auctionAndOrder.refund)
  let subjectAmount = auctionAndOrder.reward
  if (subjectAmount.equals(BigInt.zero())) {
    log.warning("Subject amount is zero, txHash: {}", [event.transaction.hash.toHexString()])
    return
  }
  let price = protocolTokenAmount.divDecimal(subjectAmount.toBigDecimal())

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(Address.fromBytes(auctionAndOrder.user.userAddress), subjectTokenAddress, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(protocolTokenAmount)
  // portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(subjectAmount)

  savePortfolio(portfolio, event.block)

  let user = getOrCreateUser(Address.fromBytes(auctionAndOrder.user.userAddress), event.block)
  // increasing user protocol token spent
  user.buyVolume = user.buyVolume.plus(protocolTokenAmount)
  // increasing user investment
  // user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  saveUser(user, event.block)

  // const summary = getOrCreateSummary()
  // summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  // summary.numberOfBuyOrders = summary.numberOfBuyOrders.plus(BigInt.fromI32(1))
  // summary.totalBuyVolume = summary.totalBuyVolume.plus(protocolTokenAmount)
  // summary.save()

  let subjectToken = getOrCreateSubjectToken(subjectTokenAddress, event.block)
  subjectToken.buySideVolume = subjectToken.buySideVolume.plus(protocolTokenAmount)
  // subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(protocolTokenAmount))
  subjectToken.currentPriceInMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(protocolTokenAmount)
  saveSubjectToken(subjectToken, event.block)
}

export function handleNewAuction(event: NewAuction): void {
  // minFundingThresholdNotReached = event.params.minFundingThresholdNotReached need to see
  let auction = new Auction(event.params.auctionId.toString())
  auction.minFundingThreshold = event.params.minFundingThreshold
  auction.auctionEndDate = event.params.auctionEndDate
  auction.protocolToken = event.params._biddingToken
  auction.subjectToken = getOrCreateSubjectToken(event.params._auctioningToken, event.block).id
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
