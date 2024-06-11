// For understanding the code better, I use the following assumptions
// AUT - Test Auctioning Token. The auctioneer wants to sell this token
// BDT - Test Bidding Token. The auctioneer wants to buy this token

// While initiating an auction, the exactOrder/initialOrder sellAmount corresponds to AUT and buyAmount corresponds to BDT
// While placing an order, the sellAmount corresponds to BDT and buyAmount corresponds to AUT

import {
  Address,
  BigInt,
  BigDecimal,
  log,
  dataSource,
  store,
  Bytes,
} from "@graphprotocol/graph-ts"
import { ERC20Contract } from "../generated/EasyAuction/ERC20Contract"
import { AuctionDetail, Token, User } from "../generated/schema"
import {
  EasyAuction,
  AuctionCleared,
  CancellationSellOrder,
  ClaimedFromOrder,
  NewAuction,
  NewSellOrder,
  NewUser,
  OwnershipTransferred,
  UserRegistration,
} from "../generated/EasyAuction/EasyAuction"
import { Order } from "../generated/schema"
import sortOrders from "./utils/sortOrders"

const ZERO = BigInt.zero()
const ONE = BigInt.fromI32(1)
const TEN = BigInt.fromString("10")

export function _handleAuctionCleared(event: AuctionCleared): void {
  const auctioningTokensSold = event.params.soldAuctioningTokens
  const auctionId = event.params.auctionId
  const biddingTokensSold = event.params.soldBiddingTokens

  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }
  let auctioningToken = Token.load(auctionDetails.auctioningToken)
  if (!auctioningToken) {
    throw new Error("Auctioning token not found")
  }
  let biddingToken = Token.load(auctionDetails.biddingToken)
  if (!biddingToken) {
    throw new Error("Bidding token not found")
  }
  const decimalAuctioningToken = auctioningToken.decimals
  const decimalBiddingToken = biddingToken.decimals

  auctionDetails.currentClearingOrderBuyAmount = auctioningTokensSold
  auctionDetails.currentClearingOrderSellAmount = biddingTokensSold
  const pricePoint = _convertToPricePoint(
    biddingTokensSold,
    auctioningTokensSold,
    decimalAuctioningToken.toI32(),
    decimalBiddingToken.toI32()
  )
  auctionDetails.currentClearingPrice = pricePoint.get("price")
  auctionDetails.currentVolume = pricePoint.get("volume")
  auctionDetails.currentBiddingAmount = biddingTokensSold
  auctionDetails.interestScore = pricePoint
    .get("volume")
    .div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

  auctionDetails.save()
}

export function _handleCancellationSellOrder(
  event: CancellationSellOrder
): void {
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId
  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }
  // Remove order from the list orders
  let orders: string[] = []
  if (auctionDetails.orders) {
    orders = auctionDetails.orders!
  }
  let orderId = _getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  // setting order as cancelled
  let order = Order.load(orderId)
  if (order) {
    order.status = "Cancelled"
    order.save()
  }
  let index = orders.indexOf(orderId)
  // removing cancelled order from ordersWithoutClaimedOrCancelled array
  let ordersWithoutClaimedOrCancelled: string[] = []
  if (auctionDetails.ordersWithoutClaimedOrCancelled) {
    ordersWithoutClaimedOrCancelled =
      auctionDetails.ordersWithoutClaimedOrCancelled!
  }
  index = ordersWithoutClaimedOrCancelled.indexOf(orderId)
  if (index > -1) {
    let removedOrder = ordersWithoutClaimedOrCancelled.splice(index, 1)
  }

  // removing cancelled order from ordersWithoutCancelled array
  auctionDetails.ordersWithoutClaimedOrCancelled =
    ordersWithoutClaimedOrCancelled
  auctionDetails.save()
  let ordersWithoutCancelled: string[] = []
  if (auctionDetails.ordersWithoutCancelled) {
    ordersWithoutCancelled = auctionDetails.ordersWithoutCancelled!
  }
  index = ordersWithoutCancelled.indexOf(orderId)
  if (index > -1) {
    ordersWithoutCancelled.splice(index, 1)
  }
  auctionDetails.ordersWithoutCancelled = ordersWithoutCancelled

  updateClearingOrderAndVolume(auctionDetails.auctionId)
  calculateHighestAndLowestBid(auctionId)
  calculateUniqueBidders(auctionId)
}

// Remove claimed orders
export function _handleClaimedFromOrder(event: ClaimedFromOrder): void {
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId
  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }
  // Remove order from the list of orders in the ordersWithoutClaimedOrCancelled array
  let ordersWithoutClaimedOrCancelled: string[] = []
  if (auctionDetails.ordersWithoutClaimedOrCancelled) {
    ordersWithoutClaimedOrCancelled =
      auctionDetails.ordersWithoutClaimedOrCancelled!
  }
  let orderId = _getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  // setting order as claimed
  let order = Order.load(orderId)
  if (order) {
    order.status = "Claimed"
    order.save()
  }

  // If orderId is present in the ordersWithoutClaimedOrCancelled array, remove it
  let index = ordersWithoutClaimedOrCancelled.indexOf(orderId)
  if (index > -1) {
    ordersWithoutClaimedOrCancelled.splice(index, 1)
  }
  auctionDetails.ordersWithoutClaimedOrCancelled =
    ordersWithoutClaimedOrCancelled
  auctionDetails.save()
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

export function _handleNewAuction(event: NewAuction): void {
  let eventTimeStamp = event.block.timestamp
  let sellAmount = event.params._auctionedSellAmount
  let buyAmount = event.params._minBuyAmount
  let userId = event.params.userId
  let auctionId = event.params.auctionId
  let addressAuctioningToken = event.params._auctioningToken
  let addressBiddingToken = event.params._biddingToken
  let allowListSigner = event.params.allowListData
  let allowListContract = event.params.allowListContract

  let entityId = _getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  let user = User.load(userId.toString())
  if (!user) {
    return
  }
  let auctioningTokenDetails = getTokenDetails(addressAuctioningToken)
  let biddingTokenDetails = getTokenDetails(addressBiddingToken)

  let auctionContract = EasyAuction.bind(event.address)
  let isAtomicClosureAllowed = auctionContract.auctionData(auctionId).value11

  let pricePoint = _convertToPricePoint(
    sellAmount,
    buyAmount,
    biddingTokenDetails.decimals.toI32(),
    auctioningTokenDetails.decimals.toI32()
  )

  let isPrivateAuction = allowListContract.equals(
    Address.fromString("0x0000000000000000000000000000000000000000")
  )
    ? false
    : true

  let order = new Order(entityId)
  // order.auctionId = auctionId
  order.auction = auctionId.toString()
  order.buyAmount = buyAmount
  order.sellAmount = sellAmount
  // order.userId = userId
  // order.userAddress = user.address
  order.user = user.id
  order.volume = pricePoint.get("volume")
  order.price = ONE.divDecimal(pricePoint.get("price"))
  order.timestamp = eventTimeStamp
  order.status = "Placed"
  order.save()

  let auctionDetails = new AuctionDetail(auctionId.toString())
  auctionDetails.auctionId = auctionId
  auctionDetails.exactOrder = order.id

  auctionDetails.auctioningToken = auctioningTokenDetails.id
  auctionDetails.biddingToken = biddingTokenDetails.id

  auctionDetails.endTimeTimestamp = event.params.auctionEndDate
  auctionDetails.orderCancellationEndDate =
    event.params.orderCancellationEndDate
  auctionDetails.startingTimeStamp = eventTimeStamp
  auctionDetails.minimumBiddingAmountPerOrder =
    event.params.minimumBiddingAmountPerOrder
  auctionDetails.minFundingThreshold = event.params.minFundingThreshold
  auctionDetails.allowListManager = event.params.allowListContract
  auctionDetails.allowListSigner = allowListSigner
  auctionDetails.currentClearingPrice = ONE.divDecimal(pricePoint.get("price"))
  auctionDetails.currentBiddingAmount = new BigInt(0)
  auctionDetails.isAtomicClosureAllowed = isAtomicClosureAllowed
  auctionDetails.isPrivateAuction = isPrivateAuction
  auctionDetails.interestScore = new BigDecimal(new BigInt(0))
  auctionDetails.currentVolume = BigDecimal.fromString("0")
  auctionDetails.currentClearingOrderSellAmount = new BigInt(0)
  auctionDetails.currentClearingOrderBuyAmount = new BigInt(0)
  auctionDetails.orders = []
  auctionDetails.ordersWithoutCancelled = []
  auctionDetails.ordersWithoutClaimedOrCancelled = []

  auctionDetails.txHash = event.transaction.hash
  auctionDetails.uniqueBidders = new BigInt(0)
  auctionDetails.save()
  // adding auction to order
  order.auction = auctionDetails.id
  order.save()
  // Check if auctionId is present in createdAuction list. If not, add it.
  let createdAuction = user.createdAuction
  if (!createdAuction.includes(auctionId.toString())) {
    createdAuction.push(auctionId.toString())
    user.createdAuction = createdAuction
  }
  user.save()
}

export function calculateUniqueBidders(auctionId: BigInt): void {
  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    throw new Error("Auction not found")
  }
  let ordersWithoutCancelled = auctionDetails.ordersWithoutCancelled
  if (!ordersWithoutCancelled) {
    throw new Error("ordersWithoutCancelled not found")
  }
  let uniqueBidders = new Array<string>()
  for (let i = 0; i < ordersWithoutCancelled.length; i++) {
    let order = Order.load(ordersWithoutCancelled[i])
    if (!order) {
      throw new Error("Order not found")
    }
    if (!uniqueBidders.includes(order.user)) {
      uniqueBidders.push(order.user)
    }
  }
  auctionDetails.uniqueBidders = BigInt.fromI32(uniqueBidders.length)
  auctionDetails.save()
}

export function _convertToPricePoint(
  sellAmount: BigInt,
  buyAmount: BigInt,
  decimalsBuyToken: number,
  decimalsSellToken: number
): Map<string, BigDecimal> {
  if (buyAmount.equals(ZERO)) {
    let pricePoint = new Map<string, BigDecimal>()
    pricePoint.set("price", BigDecimal.fromString("0"))
    pricePoint.set("volume", BigDecimal.fromString("1"))

    return pricePoint
  }
  let bidByAuctionDecimal = TEN.pow(<u8>decimalsBuyToken).divDecimal(
    TEN.pow(<u8>decimalsSellToken).toBigDecimal()
  )

  let price: BigDecimal = sellAmount
    .divDecimal(buyAmount.toBigDecimal())
    .times(bidByAuctionDecimal)
  let volume: BigDecimal = sellAmount.divDecimal(
    TEN.pow(<u8>decimalsSellToken).toBigDecimal()
  )

  let pricePoint = new Map<string, BigDecimal>()
  pricePoint.set("price", price)
  pricePoint.set("volume", volume)

  return pricePoint
}

/**
 *	@dev This function is called when a new sell order is placed
 *  OrderID is generated by concatenating auctionId, sellAmount, buyAmount and userId
 */
export function _handleNewSellOrder(event: NewSellOrder): void {
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId

  let user = User.load(userId.toString())
  if (!user) {
    user = new User(userId.toString())
  }

  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }
  let auctioningToken = Token.load(auctionDetails.auctioningToken)
  if (!auctioningToken) {
    throw new Error("Auctioning token not found")
  }
  let biddingToken = Token.load(auctionDetails.biddingToken)
  if (!biddingToken) {
    throw new Error("Bidding token not found")
  }

  let entityId = `${auctionId.toString()}-${sellAmount.toString()}-${buyAmount.toString()}-${userId.toString()}`
  let pricePoint = _convertToPricePoint(
    sellAmount,
    buyAmount,
    auctioningToken.decimals.toI32(),
    biddingToken.decimals.toI32()
  )

  let order = new Order(entityId)
  // order.auctionId = auctionId
  order.buyAmount = buyAmount
  order.sellAmount = sellAmount
  // order.userId = userId
  // order.userAddress = user.address
  order.user = user.id
  order.price = pricePoint.get("price")
  order.volume = pricePoint.get("volume")
  order.timestamp = event.block.timestamp
  order.auction = auctionDetails.id
  order.user = user.id
  order.status = "Placed"
  order.save()

  let orders: string[] = []
  if (auctionDetails.orders) {
    orders = auctionDetails.orders!
  }
  orders.push(order.id)
  auctionDetails.orders = orders

  let ordersWithoutClaimedOrCancelled: string[] = []
  if (auctionDetails.ordersWithoutClaimedOrCancelled) {
    ordersWithoutClaimedOrCancelled =
      auctionDetails.ordersWithoutClaimedOrCancelled!
  }
  ordersWithoutClaimedOrCancelled.push(order.id)
  auctionDetails.ordersWithoutClaimedOrCancelled =
    ordersWithoutClaimedOrCancelled
  let ordersWithoutCancelled: string[] = []
  if (auctionDetails.ordersWithoutCancelled) {
    ordersWithoutCancelled = auctionDetails.ordersWithoutCancelled!
  }
  ordersWithoutCancelled.push(order.id)
  auctionDetails.ordersWithoutCancelled = ordersWithoutCancelled

  // Check if auctionId is present in participatedAuction list. If not, add it.
  let participatedAuction = user.participatedAuction
  if (!participatedAuction.includes(auctionId.toString())) {
    participatedAuction.push(auctionId.toString())
    user.participatedAuction = participatedAuction
  }
  user.save()
  auctionDetails.save()

  updateClearingOrderAndVolume(auctionDetails.auctionId)
  calculateHighestAndLowestBid(auctionId)
  calculateUniqueBidders(auctionId)
}

export function _handleNewUser(event: NewUser): void {
  let userId = event.params.userId
  let userAddress = event.params.userAddress
  let user = new User(userId.toString())
  user.address = userAddress
  user.createdAuction = new Array()
  user.participatedAuction = new Array()
  user.save()
}

export function _handleOwnershipTransferred(
  event: OwnershipTransferred
): void {}

export function _handleUserRegistration(event: UserRegistration): void {}

export function _getOrderEntityId(
  auctionId: BigInt,
  sellAmount: BigInt,
  buyAmount: BigInt,
  userId: BigInt
): string {
  return `${auctionId.toString()}-${sellAmount.toString()}-${buyAmount.toString()}-${userId.toString()}`
}

function calculateHighestAndLowestBid(auctionId: BigInt): void {
  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }
  let orders = sortOrders(auctionDetails.ordersWithoutCancelled!)
  if (orders.length > 0) {
    auctionDetails.lowestBid = orders[0]
    auctionDetails.highestBid = orders[orders.length - 1]
    auctionDetails.save()
  }
}

function updateClearingOrderAndVolume(auctionId: BigInt): void {
  let auctionDetails = AuctionDetail.load(auctionId.toString())
  if (!auctionDetails) {
    return
  }

  const auctioningToken = Token.load(auctionDetails.auctioningToken)
  if (!auctioningToken) {
    throw new Error("Auctioning token not found")
  }
  const biddingToken = Token.load(auctionDetails.biddingToken)
  if (!biddingToken) {
    throw new Error("Bidding token not found")
  }
  let decimalAuctioningToken = auctioningToken.decimals
  let decimalBiddingToken = biddingToken.decimals
  let orders = sortOrders(auctionDetails.ordersWithoutCancelled!)
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

    biddingTokenTotal = biddingTokenTotal.plus(order.sellAmount || ZERO)

    if (
      biddingTokenTotal
        .divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal())
        .ge(order.sellAmount.divDecimal(order.buyAmount.toBigDecimal()))
    ) {
      break
    }
  }

  if (!currentOrder) {
    return
  }

  if (
    biddingTokenTotal.ge(ZERO) &&
    biddingTokenTotal
      .divDecimal(auctioningTokenAmountOfInitialOrder.toBigDecimal())
      .ge(
        currentOrder.sellAmount.divDecimal(
          currentOrder.buyAmount.toBigDecimal()
        )
      )
  ) {
    let uncoveredBids = biddingTokenTotal.minus(
      auctioningTokenAmountOfInitialOrder
        .times(currentOrder.sellAmount)
        .div(currentOrder.buyAmount)
    )

    if (currentOrder.sellAmount.gt(uncoveredBids)) {
      let volume = currentOrder.sellAmount.minus(uncoveredBids)
      let currentBiddingAmount = biddingTokenTotal
        .minus(currentOrder.sellAmount)
        .plus(volume)
      auctionDetails.currentClearingOrderBuyAmount = currentOrder.buyAmount
      auctionDetails.currentClearingOrderSellAmount = currentOrder.sellAmount
      auctionDetails.currentClearingPrice = currentOrder.price
      auctionDetails.currentClearingPrice = _convertToPricePoint(
        currentOrder.sellAmount,
        currentOrder.buyAmount,
        decimalAuctioningToken.toI32(),
        decimalBiddingToken.toI32()
      ).get("price")
      auctionDetails.currentVolume = new BigDecimal(volume)
      auctionDetails.currentBiddingAmount = currentBiddingAmount
      auctionDetails.interestScore = currentBiddingAmount
        .toBigDecimal()
        .div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

      auctionDetails.save()
      return
    } else {
      let clearingOrderSellAmount = biddingTokenTotal.minus(
        currentOrder.sellAmount
      )
      let clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
      const currentBiddingAmount = biddingTokenTotal.minus(
        currentOrder.sellAmount
      )
      auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
      auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
      const currentClearingPrice = _convertToPricePoint(
        clearingOrderSellAmount,
        clearingOrderBuyAmount,
        decimalAuctioningToken.toI32(),
        decimalBiddingToken.toI32()
      ).get("price")
      auctionDetails.currentClearingPrice = currentClearingPrice
      auctionDetails.currentVolume = BigDecimal.fromString("0")
      auctionDetails.currentBiddingAmount = currentBiddingAmount
      auctionDetails.interestScore = currentBiddingAmount
        .toBigDecimal()
        .div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

      auctionDetails.save()
      return
    }
  } else if (biddingTokenTotal.ge(biddingTokenAmountOfInitialOrder)) {
    const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
    const clearingOrderSellAmount = biddingTokenTotal
    auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
    auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
    const currentClearingPrice = _convertToPricePoint(
      clearingOrderSellAmount,
      clearingOrderBuyAmount,
      decimalAuctioningToken.toI32(),
      decimalBiddingToken.toI32()
    ).get("price")
    auctionDetails.currentClearingPrice = currentClearingPrice
    auctionDetails.currentVolume = BigDecimal.fromString("0")
    auctionDetails.currentBiddingAmount = biddingTokenTotal
    auctionDetails.interestScore = biddingTokenTotal
      .toBigDecimal()
      .div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

    auctionDetails.save()
    return
  } else {
    const clearingOrderBuyAmount = auctioningTokenAmountOfInitialOrder
    const clearingOrderSellAmount = biddingTokenAmountOfInitialOrder
    const volume = new BigDecimal(biddingTokenTotal).times(
      auctioningTokenAmountOfInitialOrder.divDecimal(
        new BigDecimal(biddingTokenAmountOfInitialOrder)
      )
    )
    auctionDetails.currentClearingOrderBuyAmount = clearingOrderBuyAmount
    auctionDetails.currentClearingOrderSellAmount = clearingOrderSellAmount
    const currentClearingPrice = _convertToPricePoint(
      clearingOrderSellAmount,
      clearingOrderBuyAmount,
      decimalAuctioningToken.toI32(),
      decimalBiddingToken.toI32()
    ).get("price")
    auctionDetails.currentClearingPrice = currentClearingPrice
    auctionDetails.currentVolume = volume
    auctionDetails.currentBiddingAmount = biddingTokenTotal
    auctionDetails.interestScore = biddingTokenTotal
      .toBigDecimal()
      .div(TEN.pow(<u8>decimalBiddingToken.toI32()).toBigDecimal())

    auctionDetails.save()
    return
  }
}
