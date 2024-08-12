import { Address, BigInt, BigDecimal, ethereum, ByteArray } from "@graphprotocol/graph-ts"
import { Order, AuctionDetail, Token, User, BlockInfo, OrderCounter, Summary, OrderTxn } from "../generated/schema"
import { ERC20Contract } from "../generated/EasyAuction/ERC20Contract"

import { BLACKLISTED_AUCTION, BLACKLISTED_SUBJECT_TOKEN_ADDRESS, ORDER_ENTITY_COUNTER_ID } from "./constants"

const ZERO = BigInt.zero()
const TEN = BigInt.fromString("10")

class BidDetails {
  lowestPriceBidOrder: string
  highestPriceBidOrder: string
  uniqueHoldersCount: BigInt
  constructor() {
    this.lowestPriceBidOrder = ""
    this.highestPriceBidOrder = ""
    this.uniqueHoldersCount = BigInt.fromI32(0)
  }
}

export function convertToPricePoint(sellAmount: BigInt, buyAmount: BigInt, decimalsBuyToken: number, decimalsSellToken: number): Map<string, BigDecimal> {
  if (buyAmount.equals(ZERO)) {
    let pricePoint = new Map<string, BigDecimal>()
    pricePoint.set("price", BigDecimal.fromString("0"))
    pricePoint.set("volume", BigDecimal.fromString("1"))

    return pricePoint
  }
  let bidByAuctionDecimal = TEN.pow(<u8>decimalsBuyToken).divDecimal(TEN.pow(<u8>decimalsSellToken).toBigDecimal())

  let price: BigDecimal = sellAmount.divDecimal(buyAmount.toBigDecimal()).times(bidByAuctionDecimal)
  let volume: BigDecimal = sellAmount.divDecimal(TEN.pow(<u8>decimalsSellToken).toBigDecimal())

  let pricePoint = new Map<string, BigDecimal>()
  pricePoint.set("price", price)
  pricePoint.set("volume", volume)

  return pricePoint
}

// export function (auctionDetails: AuctionDetail,sortedOrders:string[]): void {
export function updateAuctionStats(auctionDetails: AuctionDetail): void {
  let orders = auctionDetails.activeOrders!
  if (orders.length > 0) {
    let bidDetails = getBidInformation(orders, auctionDetails.auctionId)
    auctionDetails.uniqueBidders = bidDetails.uniqueHoldersCount
    auctionDetails.highestPriceBidOrder = bidDetails.highestPriceBidOrder
    auctionDetails.lowestPriceBidOrder = bidDetails.lowestPriceBidOrder
    auctionDetails.save()
  }
}

export function getOrderEntityId(auctionId: BigInt, sellAmount: BigInt, buyAmount: BigInt, userId: BigInt): string {
  return `${auctionId.toString()}-${sellAmount.toString()}-${buyAmount.toString()}-${userId.toString()}`
}

export function loadUser(userId: string): User {
  let user = User.load(userId)
  if (!user) {
    throw new Error("User not found, userId: " + userId.toString())
  }
  return user as User
}

export function loadAuctionDetail(auctionId: string): AuctionDetail {
  let auctionDetail = AuctionDetail.load(auctionId)
  if (!auctionDetail) {
    throw new Error("Auction not found, auctionId: " + auctionId.toString())
  }
  return auctionDetail as AuctionDetail
}

export function loadToken(tokenAddress: string): Token {
  let token = Token.load(tokenAddress)
  if (!token) {
    throw new Error("Token not found, tokenAddress: " + tokenAddress)
  }
  return token as Token
}
export function loadOrder(orderId: string): Order {
  let order = Order.load(orderId)
  if (!order) {
    throw new Error("Order not found, orderId: " + orderId)
  }
  return order as Order
}

export function loadSummary(): Summary {
  let summary = Summary.load("SUMMARY")
  if (!summary) {
    summary = new Summary("SUMMARY")
    summary.totalBiddingValue = BigInt.fromI32(0)
    summary.totalOrders = BigInt.fromI32(0)
    summary.totalAuctions = BigInt.fromI32(0)
    summary.save()
  }
  return summary as Summary
}

export function getTokenDetails(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString())
  if (token) {
    return token
  }
  let tokenContract = ERC20Contract.bind(tokenAddress)
  let decimals = tokenContract.decimals()
  let symbol = tokenContract.symbol()
  token = new Token(tokenAddress.toHexString())
  token.decimals = BigInt.fromI32(decimals)
  token.symbol = symbol
  token.save()
  return token
}

export function getTxEntityId(event: ethereum.Event): string {
  let txHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex.toString()
  if (txHash == "" || logIndex == "") {
    throw new Error("txHash or logIndex is null")
  }
  return txHash.concat("-").concat(logIndex)
}

export function getOrCreateBlockInfo(event: ethereum.Event): BlockInfo {
  let blockInfo = BlockInfo.load(event.block.number.toString())
  if (!blockInfo) {
    blockInfo = new BlockInfo(event.block.number.toString())
    blockInfo.timestamp = event.block.timestamp
    blockInfo.blockNumber = event.block.number
    blockInfo.hash = event.block.hash
    blockInfo.save()
  }
  return blockInfo
}

export function getEncodedOrderId(userId: BigInt, buyAmount: BigInt, sellAmount: BigInt): string {
  return "0x" + userId.toHexString().slice(2).padStart(16, "0") + buyAmount.toHexString().slice(2).padStart(24, "0") + sellAmount.toHexString().slice(2).padStart(24, "0")
}

// creates a new order transaction
export function createOrderTxn(event: ethereum.Event, orderId: string, status: string): void {
  let orderTxn = new OrderTxn(getTxEntityId(event))
  orderTxn.order = orderId
  orderTxn.txHash = event.transaction.hash
  orderTxn.blockInfo = getOrCreateBlockInfo(event).id
  orderTxn.newStatus = status
  orderTxn.save()
}

export function updateOrderCounter(): BigInt {
  let orderEntityCounter = OrderCounter.load(ORDER_ENTITY_COUNTER_ID)
  if (!orderEntityCounter) {
    orderEntityCounter = new OrderCounter(ORDER_ENTITY_COUNTER_ID)
    orderEntityCounter.counter = BigInt.fromI32(0)
  }
  orderEntityCounter.counter = orderEntityCounter.counter.plus(BigInt.fromI32(1))
  orderEntityCounter.save()
  return orderEntityCounter.counter
}

function getBidInformation(orders: string[], auctionId: BigInt): BidDetails {
  let bidDetails = new BidDetails()
  if (orders.length == 0) {
    return bidDetails
  }

  let order = orders[0]
  let uniqueBidders = new Set<string>()
  let orderArr = order.split("-")
  let initialLowestBiddingTokenAmount = BigInt.fromString(orderArr[1])
  let initialLowestAuctioningTokenAmount = BigInt.fromString(orderArr[2])
  let initialLowestUserId = BigInt.fromString(orderArr[3])
  let initialLowestPrice = initialLowestBiddingTokenAmount.div(initialLowestAuctioningTokenAmount)
  uniqueBidders.add(initialLowestUserId.toString())

  let initialHighestBiddingTokenAmount = BigInt.fromString(orderArr[1])
  let initialHighestAuctioningTokenAmount = BigInt.fromString(orderArr[2])
  let initialHighestUserId = BigInt.fromString(orderArr[3])
  let initialHighestPrice = initialLowestBiddingTokenAmount.div(initialLowestAuctioningTokenAmount)

  for (let i = 1; i < orders.length; i++) {
    let order = orders[i]
    let orderArr = order.split("-")
    let biddingTokenAmount = BigInt.fromString(orderArr[1])
    let auctioningTokenAmount = BigInt.fromString(orderArr[2])
    let userId = BigInt.fromString(orderArr[3])
    let currentPrice = biddingTokenAmount.div(auctioningTokenAmount)
    uniqueBidders.add(userId.toString())
    if (currentPrice.lt(initialLowestPrice)) {
      initialLowestBiddingTokenAmount = biddingTokenAmount
      initialLowestAuctioningTokenAmount = auctioningTokenAmount
      initialLowestUserId = userId
      initialLowestPrice = currentPrice
    } else if (currentPrice.equals(initialLowestPrice) && biddingTokenAmount.lt(initialLowestBiddingTokenAmount)) {
      initialLowestBiddingTokenAmount = biddingTokenAmount
      initialLowestAuctioningTokenAmount = auctioningTokenAmount
      initialLowestUserId = userId
      initialLowestPrice = currentPrice
    } else if (currentPrice.equals(initialLowestPrice) && biddingTokenAmount.equals(initialLowestBiddingTokenAmount) && userId.lt(initialLowestUserId)) {
      initialLowestBiddingTokenAmount = biddingTokenAmount
      initialLowestAuctioningTokenAmount = auctioningTokenAmount
      initialLowestUserId = userId
      initialLowestPrice = currentPrice
    }

    if (currentPrice.gt(initialHighestPrice)) {
      initialHighestBiddingTokenAmount = biddingTokenAmount
      initialHighestAuctioningTokenAmount = auctioningTokenAmount
      initialHighestUserId = userId
      initialHighestPrice = currentPrice
    } else if (currentPrice.equals(initialHighestPrice) && biddingTokenAmount.gt(initialHighestBiddingTokenAmount)) {
      initialHighestBiddingTokenAmount = biddingTokenAmount
      initialHighestAuctioningTokenAmount = auctioningTokenAmount
      initialHighestUserId = userId
      initialHighestPrice = currentPrice
    } else if (currentPrice.equals(initialHighestPrice) && biddingTokenAmount.equals(initialHighestBiddingTokenAmount) && userId.gt(initialHighestUserId)) {
      initialHighestBiddingTokenAmount = biddingTokenAmount
      initialHighestAuctioningTokenAmount = auctioningTokenAmount
      initialHighestUserId = userId
      initialHighestPrice = currentPrice
    }
  }
  bidDetails.lowestPriceBidOrder = getOrderEntityId(auctionId, initialLowestBiddingTokenAmount, initialLowestAuctioningTokenAmount, initialLowestUserId)
  bidDetails.highestPriceBidOrder = getOrderEntityId(auctionId, initialHighestBiddingTokenAmount, initialHighestAuctioningTokenAmount, initialHighestUserId)
  bidDetails.uniqueHoldersCount = BigInt.fromI32(uniqueBidders.size)

  return bidDetails
}
//getClaimedAmounts(order, event, auctionDetails)
export function getClaimedAmounts(order: Order, auctionDetails: AuctionDetail): BigInt[] {
  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()
  let orderArr = auctionDetails.currentClearingOrderId.split("-")
  let priceDenominator = BigInt.fromString(orderArr[1])
  let priceNumerator = BigInt.fromString(orderArr[2])
  let userId = BigInt.fromString(orderArr[3])

  //This means that the moxie funding the auction asked for is not met so all moxie is refunded
  if (auctionDetails.minFundingThreshold.gt(auctionDetails.currentClearingOrderSellAmount)) {
    sumBiddingTokenAmount = order.sellAmount
  } else {
    //Checking if the order is the clearing price order
    if (priceNumerator.equals(order.buyAmount) && priceDenominator.equals(order.sellAmount) && userId.equals(BigInt.fromString(order.user))) {
      let diff = auctionDetails.volumeClearingPriceOrder.times(priceNumerator).div(priceDenominator)
      sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(diff)
      sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount.minus(auctionDetails.volumeClearingPriceOrder))
    } else {
      if (smallerThan(order, priceDenominator, priceNumerator, userId)) {
        sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(order.sellAmount).times(priceNumerator).div(priceDenominator)
      } else {
        sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount)
      }
    }
  }
  //refund, subjectTokenPurchased, moxie spent
  return [sumBiddingTokenAmount, sumAuctioningTokenAmount, order.sellAmount.minus(sumBiddingTokenAmount)]
}

function smallerThan(orderA: Order, sellAmount: BigInt, buyAmount: BigInt, userId: BigInt): boolean {
  if (orderA.buyAmount.times(sellAmount) < buyAmount.times(orderA.sellAmount)) return true
  if (orderA.buyAmount.times(sellAmount) > buyAmount.times(orderA.sellAmount)) return false
  if (orderA.buyAmount < buyAmount) return true
  if (orderA.buyAmount > buyAmount) return false
  if (BigInt.fromString(orderA.user).lt(userId)) return true
  return false
}

export function increaseTotalBiddingValueAndOrdersCount(value: BigInt, isNewAuction: boolean): void {
  let summary = loadSummary()
  summary.totalBiddingValue = summary.totalBiddingValue.plus(value)
  summary.totalOrders = summary.totalOrders.plus(BigInt.fromI32(1))
  if (isNewAuction) {
    summary.totalAuctions = summary.totalAuctions.plus(BigInt.fromI32(1))
  }
  summary.save()
}

export function decreaseTotalBiddingValueAndOrdersCount(value: BigInt): void {
  let summary = loadSummary()
  summary.totalBiddingValue = summary.totalBiddingValue.minus(value)
  summary.totalOrders = summary.totalOrders.minus(BigInt.fromI32(1))
  summary.save()
}

export function convertHexStringToBigInt(hexString: string): BigInt {
  let paddedHexString = hexZeroPad(hexString)
  const bytes = ByteArray.fromHexString(paddedHexString).reverse()
  return BigInt.fromByteArray(changetype<ByteArray>(bytes))
}

function hexZeroPad(hexstring: string, length: i32 = 32): string {
  return hexstring.substr(0, 2) + hexstring.substr(2).padStart(length * 2, "0")
}

export function isBlacklistedSubjectTokenAddress(subjectAddress: Address): bool {
  return BLACKLISTED_SUBJECT_TOKEN_ADDRESS.isSet(subjectAddress.toHexString())
}

export function isBlacklistedAuction(auctionId: string): bool {
  return BLACKLISTED_AUCTION.isSet(auctionId)
}
