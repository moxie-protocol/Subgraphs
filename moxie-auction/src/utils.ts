import { Address, BigInt, BigDecimal, log, ethereum } from "@graphprotocol/graph-ts"
import { Order, AuctionDetail, Token, User, Summary, BlockInfo } from "../generated/schema"
import { ERC20Contract } from "../generated/EasyAuction/ERC20Contract"

import sortOrders from "./utils/sortOrders"

const ZERO = BigInt.zero()
const TEN = BigInt.fromString("10")

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

export function getUniqueBiddersCount(orderIds: string[]): BigInt {
  let uniqueBidders = new Array<string>()
  for (let i = 0; i < orderIds.length; i++) {
    let order = Order.load(orderIds[i])
    if (!order) {
      throw new Error("Order not found")
    }
    if (!uniqueBidders.includes(order.user)) {
      uniqueBidders.push(order.user)
    }
  }
  return BigInt.fromI32(uniqueBidders.length)
}

// export function (auctionDetails: AuctionDetail,sortedOrders:string[]): void {
export function updateAuctionStats(auctionId: BigInt): void {
  let auctionDetails = loadAuctionDetail(auctionId.toString())
  const auctioningToken = loadToken(auctionDetails.auctioningToken)
  const biddingToken = loadToken(auctionDetails.biddingToken)

  let decimalAuctioningToken = auctioningToken.decimals
  let decimalBiddingToken = biddingToken.decimals
  let orders = sortOrders(auctionDetails.activeOrders!)
  if (orders.length > 0) {
    auctionDetails.uniqueBidders = getUniqueBiddersCount(orders)
    auctionDetails.lowestPriceBidOrder = orders[0]
    auctionDetails.higestPriceBidOrder = orders[orders.length - 1]
    auctionDetails.save()
  }
  const initialOrderDetailsList = auctionDetails.exactOrder.split("-")
  const initialOrderSellAmount = BigInt.fromString(initialOrderDetailsList[1])
  const initialOrderBuyAmount = BigInt.fromString(initialOrderDetailsList[2])

  const auctioningTokenAmountOfInitialOrder = initialOrderSellAmount
  const biddingTokenAmountOfInitialOrder = initialOrderBuyAmount

  let biddingTokenTotal = ZERO
  let currentOrder: Order | null = null

  // Loop through all the sorted orders
  // Orders are sorted from highest price to lowest
  for (let i = 0; i < orders.length; i++) {
    let order = Order.load(orders[i])
    if (!order) {
      return
    }
    currentOrder = order
    // calculated the total bidding token amount (sellAmount is amount of moxie token on each order)
    biddingTokenTotal = biddingTokenTotal.plus(order.sellAmount || ZERO)

    if (biddingTokenTotal.divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal()).ge(order.sellAmount.divDecimal(order.buyAmount.toBigDecimal()))) {
      break
    }
  }

  if (!currentOrder) {
    return
  }
  if (biddingTokenTotal.ge(ZERO) && biddingTokenTotal.divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal()).ge(currentOrder.sellAmount.divDecimal(currentOrder.buyAmount.toBigDecimal()))) {
    let uncoveredBids = biddingTokenTotal.minus(auctioningTokenAmountOfInitialOrder.times(currentOrder.sellAmount).div(currentOrder.buyAmount))

    if (currentOrder.sellAmount.gt(uncoveredBids)) {
      let volume = currentOrder.sellAmount.minus(uncoveredBids)
      let currentBiddingAmount = biddingTokenTotal.minus(currentOrder.sellAmount).plus(volume)
      auctionDetails.currentClearingOrderBuyAmount = currentOrder.buyAmount
      auctionDetails.currentClearingOrderSellAmount = currentOrder.sellAmount

      auctionDetails.currentClearingPrice = convertToPricePoint(currentOrder.sellAmount, currentOrder.buyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
      auctionDetails.currentVolume = new BigDecimal(volume)
      auctionDetails.currentBiddingAmount = currentBiddingAmount
      auctionDetails.interestScore = currentBiddingAmount.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

      auctionDetails.save()
      return
    } else {
      let clearingOrderSellAmount = biddingTokenTotal.minus(currentOrder.sellAmount)
      let clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
      const currentBiddingAmount = biddingTokenTotal.minus(currentOrder.sellAmount)
      auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
      auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
      const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
      auctionDetails.currentClearingPrice = currentClearingPrice
      auctionDetails.currentVolume = BigDecimal.fromString("0")
      auctionDetails.currentBiddingAmount = currentBiddingAmount
      auctionDetails.interestScore = currentBiddingAmount.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

      auctionDetails.save()
      return
    }
  } else if (biddingTokenTotal.ge(biddingTokenAmountOfInitialOrder)) {
    const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
    const clearingOrderSellAmount = biddingTokenTotal
    auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
    auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
    const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
    auctionDetails.currentClearingPrice = currentClearingPrice
    auctionDetails.currentVolume = BigDecimal.fromString("0")
    auctionDetails.currentBiddingAmount = biddingTokenTotal
    auctionDetails.interestScore = biddingTokenTotal.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

    auctionDetails.save()
    return
  } else {
    const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
    const clearingOrderSellAmount = biddingTokenAmountOfInitialOrder

    const volume = new BigDecimal(biddingTokenTotal).times(auctioningTokenAmountOfInitialOrder.divDecimal(new BigDecimal(biddingTokenAmountOfInitialOrder)))
    auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
    auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
    const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
    auctionDetails.currentClearingPrice = currentClearingPrice
    auctionDetails.currentVolume = volume
    auctionDetails.currentBiddingAmount = biddingTokenTotal
    auctionDetails.interestScore = biddingTokenTotal.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

    auctionDetails.save()
    return
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

export function increaseTotalBiddingValueAndOrdersCount(value: BigInt): void {
  let summary = loadSummary()
  summary.totalBiddingValue = summary.totalBiddingValue.plus(value)
  summary.totalOrders = summary.totalOrders.plus(BigInt.fromI32(1))
  summary.save()
}

export function decreaseTotalBiddingValueAndOrdersCount(value: BigInt): void {
  let summary = loadSummary()
  summary.totalBiddingValue = summary.totalBiddingValue.minus(value)
  summary.totalOrders = summary.totalOrders.minus(BigInt.fromI32(1))
  summary.save()
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
