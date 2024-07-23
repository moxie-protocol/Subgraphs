import { Address, BigInt, BigDecimal, log, ethereum } from "@graphprotocol/graph-ts"
import { Order, AuctionDetail, Token, User, BlockInfo, OrderCounter, ClearingPriceOrder } from "../generated/schema"
import { ERC20Contract } from "../generated/EasyAuction/ERC20Contract"

import { ORDER_ENTITY_COUNTER_ID } from "./constants"

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
  let uniqueBidders = new Set<string>()
  for (let i = 0; i < orderIds.length; i++) {
    let orderArr = orderIds[i].split("-")
    uniqueBidders.add(orderArr[3])
  }
  return BigInt.fromI32(uniqueBidders.size)
}

// export function (auctionDetails: AuctionDetail,sortedOrders:string[]): void {
export function updateAuctionStats(auctionDetails: AuctionDetail): void {
  let orders = auctionDetails.activeOrders!
  if (orders.length > 0) {
    auctionDetails.uniqueBidders = getUniqueBiddersCount(orders)
    auctionDetails.highestPriceBidOrder = getHighestBidId(orders)
    auctionDetails.lowestPriceBidOrder = getLowestBidId(orders)
    auctionDetails.save()
  }
  // const initialOrderDetailsList = auctionDetails.exactOrder.split("-")
  // const initialOrderSellAmount = BigInt.fromString(initialOrderDetailsList[1])
  // const initialOrderBuyAmount = BigInt.fromString(initialOrderDetailsList[2])

  // const auctioningTokenAmountOfInitialOrder = initialOrderSellAmount
  // const biddingTokenAmountOfInitialOrder = initialOrderBuyAmount

  // let biddingTokenTotal = ZERO
  // let currentOrderId = ""

  // // Loop through all the sorted orders
  // // Orders are sorted from highest price to lowest
  // for (let i = 0; i < orders.length; i++) {
  //   let order = orders[i]
  //   currentOrderId = order
  //   let orderArr = order.split("-")
  //   let orderSellAmount = BigInt.fromString(orderArr[1])
  //   let orderBuyAmount = BigInt.fromString(orderArr[2])
  //   // calculated the total bidding token amount (sellAmount is amount of moxie token on each order)
  //   biddingTokenTotal = biddingTokenTotal.plus(orderSellAmount || ZERO)

  //   if (biddingTokenTotal.divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal()).ge(orderSellAmount.divDecimal(orderBuyAmount.toBigDecimal()))) {
  //     break
  //   }
  // }

  // if (currentOrderId.length == 0) {  
  //   return
  // }
  // let orderArr = currentOrderId.split("-")
  // let currentOrderSellAmount = BigInt.fromString(orderArr[1])
  // let currentOrderBuyAmount = BigInt.fromString(orderArr[2])

  // if (biddingTokenTotal.ge(ZERO) && biddingTokenTotal.divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal()).ge(currentOrderSellAmount.divDecimal(currentOrderBuyAmount.toBigDecimal()))) {
  //   let uncoveredBids = biddingTokenTotal.minus(auctioningTokenAmountOfInitialOrder.times(currentOrderSellAmount).div(currentOrderBuyAmount))

  //   if (currentOrderSellAmount.gt(uncoveredBids)) {
  //     let volume = currentOrderSellAmount.minus(uncoveredBids)
  //     let currentBiddingAmount = biddingTokenTotal.minus(currentOrderSellAmount).plus(volume)
  //     auctionDetails.currentClearingOrderBuyAmount = currentOrderBuyAmount
  //     auctionDetails.currentClearingOrderSellAmount = currentOrderSellAmount

  //     auctionDetails.currentClearingPrice = convertToPricePoint(currentOrderSellAmount, currentOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
  //     auctionDetails.currentVolume = new BigDecimal(volume)
  //     auctionDetails.currentBiddingAmount = currentBiddingAmount
  //     auctionDetails.interestScore = currentBiddingAmount.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

  //     auctionDetails.save()
  //     return
  //   } else {
  //     let clearingOrderSellAmount = biddingTokenTotal.minus(currentOrderSellAmount)
  //     let clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
  //     const currentBiddingAmount = biddingTokenTotal.minus(currentOrderSellAmount)
  //     auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
  //     auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
  //     const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
  //     auctionDetails.currentClearingPrice = currentClearingPrice
  //     auctionDetails.currentVolume = BigDecimal.fromString("0")
  //     auctionDetails.currentBiddingAmount = currentBiddingAmount
  //     auctionDetails.interestScore = currentBiddingAmount.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

  //     auctionDetails.save()
  //     return
  //   }
  // } else if (biddingTokenTotal.ge(biddingTokenAmountOfInitialOrder)) {
  //   const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
  //   const clearingOrderSellAmount = biddingTokenTotal
  //   auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
  //   auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
  //   const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
  //   auctionDetails.currentClearingPrice = currentClearingPrice
  //   auctionDetails.currentVolume = BigDecimal.fromString("0")
  //   auctionDetails.currentBiddingAmount = biddingTokenTotal
  //   auctionDetails.interestScore = biddingTokenTotal.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

  //   auctionDetails.save()
  //   return
  // } else {
  //   const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
  //   const clearingOrderSellAmount = biddingTokenAmountOfInitialOrder

  //   const volume = new BigDecimal(biddingTokenTotal).times(auctioningTokenAmountOfInitialOrder.divDecimal(new BigDecimal(biddingTokenAmountOfInitialOrder)))
  //   auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
  //   auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
  //   const currentClearingPrice = convertToPricePoint(clearingOrderSellAmount, clearingOrderBuyAmount, decimalAuctioningToken.toI32(), decimalBiddingToken.toI32()).get("price")
  //   auctionDetails.currentClearingPrice = currentClearingPrice
  //   auctionDetails.currentVolume = volume
  //   auctionDetails.currentBiddingAmount = biddingTokenTotal
  //   auctionDetails.interestScore = biddingTokenTotal.toBigDecimal().div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

  //   auctionDetails.save()
  //   return
  // }
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

function getHighestBidId(orders: string[]): string {
  if(orders.length == 0) {
    return ""
  }
  let order = orders[0]
  let orderArr = order.split("-")
  let initialBiddingTokenAmount = BigInt.fromString(orderArr[1])
  let initialAuctioningTokenAmount = BigInt.fromString(orderArr[2])
  let initialUserId = BigInt.fromString(orderArr[3])

  for (let i = 1; i < orders.length; i++) {
    let order = orders[i]
    let orderArr = order.split("-")
    let biddingTokenAmount = BigInt.fromString(orderArr[1])
    let auctioningTokenAmount = BigInt.fromString(orderArr[2])
    let userId = BigInt.fromString(orderArr[3])
    if (biddingTokenAmount.gt(initialBiddingTokenAmount)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    } else if (biddingTokenAmount.equals(initialBiddingTokenAmount) && auctioningTokenAmount.lt(initialAuctioningTokenAmount)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    } else if (biddingTokenAmount.equals(initialBiddingTokenAmount) && auctioningTokenAmount.equals(initialAuctioningTokenAmount) && userId.gt(initialUserId)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    }
  }
  return getOrderEntityId(BigInt.fromI32(0), initialBiddingTokenAmount, initialAuctioningTokenAmount, initialUserId)
}

function getLowestBidId(orders: string[]): string {
  if(orders.length == 0) {
    return ""
  }
  let order = orders[0]
  let orderArr = order.split("-")
  let initialBiddingTokenAmount = BigInt.fromString(orderArr[1])
  let initialAuctioningTokenAmount = BigInt.fromString(orderArr[2])
  let initialUserId = BigInt.fromString(orderArr[3])

  for (let i = 1; i < orders.length; i++) {
    let order = orders[i]
    let orderArr = order.split("-")
    let biddingTokenAmount = BigInt.fromString(orderArr[1])
    let auctioningTokenAmount = BigInt.fromString(orderArr[2])
    let userId = BigInt.fromString(orderArr[3])
    if (biddingTokenAmount.lt(initialBiddingTokenAmount)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    } else if (biddingTokenAmount.equals(initialBiddingTokenAmount) && auctioningTokenAmount.lt(initialAuctioningTokenAmount)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    } else if (biddingTokenAmount.equals(initialBiddingTokenAmount) && auctioningTokenAmount.equals(initialAuctioningTokenAmount) && userId.lt(initialUserId)) {
      initialBiddingTokenAmount = biddingTokenAmount
      initialAuctioningTokenAmount = auctioningTokenAmount
      initialUserId = userId
    }
  }
  return getOrderEntityId(BigInt.fromI32(0), initialBiddingTokenAmount, initialAuctioningTokenAmount, initialUserId)
}
//getClaimedAmounts(order, event, auctionDetails)
export function getClaimedAmounts(order: Order, event: ethereum.Event, auctionDetails: AuctionDetail): BigInt[] {
  let sumBiddingTokenAmount = BigInt.zero()
  let sumAuctioningTokenAmount = BigInt.zero()
  let priceNumerator =  auctionDetails.currentClearingOrderBuyAmount
  let priceDenominator =  auctionDetails.currentClearingOrderSellAmount
  let userId = BigInt.fromString(auctionDetails.currentClearingOrderUserId.toString())
  log.error("User ID: {}", [userId.toString()])

  //This means that the moxie funding the auction asked for is not met so all moxie is refunded
  if(auctionDetails.minFundingThreshold.gt(auctionDetails.currentClearingOrderSellAmount)){
    sumBiddingTokenAmount = order.sellAmount
  } else {
    //Checking if the order is the clearing price order
    if(auctionDetails.currentClearingOrderBuyAmount.equals(order.buyAmount) 
      && auctionDetails.currentClearingOrderSellAmount.equals(order.sellAmount) 
    && userId.equals(BigInt.fromString(order.user))){
      let diff = auctionDetails.volumeClearingPriceOrder.times(priceNumerator).div(priceDenominator)
      log.error("Diff: {} for orderId: {}", [diff.toString(), order.id])
      sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(diff)
      sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount.minus(auctionDetails.volumeClearingPriceOrder))

    } else {
        if(smallerThan(order, auctionDetails.currentClearingOrderSellAmount, auctionDetails.currentClearingOrderBuyAmount, userId)){
          sumAuctioningTokenAmount = sumAuctioningTokenAmount.plus(order.sellAmount).times(priceNumerator).div(priceDenominator)
        } else {
          sumBiddingTokenAmount = sumBiddingTokenAmount.plus(order.sellAmount)
        }
    }
  }
  //refund, subjectTokenPurchased, moxie Spent
  if (new BigInt(4) == auctionDetails.auctionId) {
    log.warning("Refund: {}, SubjectTokenPurchased: {}, MoxieSpent: {} for order id: {}", [order.sellAmount.minus(sumBiddingTokenAmount).toString(), sumAuctioningTokenAmount.toString(), sumBiddingTokenAmount.toString(), order.id])
  }
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