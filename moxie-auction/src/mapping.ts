// For understanding the code better, I use the following assumptions
// AUT - Test Auctioning Token. The auctioneer wants to sell this token
// BDT - Test Bidding Token. The auctioneer wants to buy this token

// While initiating an auction, the exactOrder/initialOrder sellAmount corresponds to AUT and buyAmount corresponds to BDT
// While placing an order, the sellAmount corresponds to BDT and buyAmount corresponds to AUT

import { Address, BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import { AuctionDetail, User } from "../generated/schema"
import { EasyAuction, AuctionCleared, CancellationSellOrder, ClaimedFromOrder, NewAuction, NewSellOrder, NewUser, OwnershipTransferred, UserRegistration } from "../generated/EasyAuction/EasyAuction"
import { Order } from "../generated/schema"
import { handleAuctionClearedTx, handleCancellationSellOrderTx, handleClaimedFromOrderTx, handleNewAuctionTx, handleNewSellOrderTx, handleNewUserTx, handleOwnershipTransferredTx, handleUserRegistrationTx } from "./transactions"

import { convertToPricePoint, updateAuctionStats, getOrderEntityId, loadUser, loadAuctionDetail, loadOrder, getTokenDetails, decreaseTotalBiddingValueAndOrdersCount, increaseTotalBiddingValueAndOrdersCount, getOrCreateBlockInfo, loadSummary, getTxEntityId, getEncodedOrderId, createOrderTxn, getClaimedAmounts, updateOrderCounter } from "./utils"
import { ORDER_STATUS_CANCELLED, ORDER_STATUS_CLAIMED, ORDER_STATUS_PLACED } from "./constants"

const ZERO = BigInt.zero()
const ONE = BigInt.fromI32(1)
const TEN = BigInt.fromString("10")

export function handleAuctionCleared(event: AuctionCleared): void {
  handleAuctionClearedTx(event)
  const auctioningTokensSold = event.params.soldAuctioningTokens
  const auctionId = event.params.auctionId
  const biddingTokensSold = event.params.soldBiddingTokens

  let auctionDetails = loadAuctionDetail(auctionId.toString())

  auctionDetails.currentClearingOrderBuyAmount = auctioningTokensSold
  auctionDetails.currentClearingOrderSellAmount = biddingTokensSold
  const pricePoint = convertToPricePoint(biddingTokensSold, auctioningTokensSold, 18, 18)
  let calculatedCurrentClearingPrice = pricePoint.get("price")
  auctionDetails.currentVolume = pricePoint.get("volume")
  auctionDetails.currentBiddingAmount = biddingTokensSold
  auctionDetails.interestScore = pricePoint.get("volume").div(TEN.pow(<u8>18).toBigDecimal())
  auctionDetails.isCleared = true

  let clearingPriceOrderString = event.params.clearingPriceOrder.toHexString()
  let userId = "0x" + clearingPriceOrderString.substring(2, 18)
  auctionDetails.currentClearingOrderUserId = BigDecimal.fromString(parseInt(userId).toString())
  let buyAmount = "0x" + clearingPriceOrderString.substring(19, 42)
  let sellAmount = "0x" + clearingPriceOrderString.substring(43, 66)

  let sellAmountBigDec = BigDecimal.fromString(parseInt(sellAmount).toString())
  let buyAmountBigDec = BigDecimal.fromString(parseInt(buyAmount).toString())
  let clearingPriceFromContract = sellAmountBigDec.div(buyAmountBigDec)
  if (calculatedCurrentClearingPrice != clearingPriceFromContract) {
    log.error("Mismatch in clearing price. Calculated: {}, from contract: {} getTxEntityId(event) {}", [calculatedCurrentClearingPrice.toString(), clearingPriceFromContract.toString(), getTxEntityId(event)])
  }
  //If there is no active order don't update the price
  if (auctionDetails.totalOrders != ZERO) {
    auctionDetails.currentClearingPrice = clearingPriceFromContract
  }
  let easyAuction = EasyAuction.bind(event.address)
  let auctionDetailFromRPC = easyAuction.auctionData(event.params.auctionId)
  auctionDetails.volumeClearingPriceOrder = auctionDetailFromRPC.value9
  auctionDetails.save()
}

export function handleCancellationSellOrder(event: CancellationSellOrder): void {
  // decreasing bid value and total Orders count in summary
  decreaseTotalBiddingValueAndOrdersCount(event.params.sellAmount)
  handleCancellationSellOrderTx(event)
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId

  let auctionDetails = loadAuctionDetail(auctionId.toString())

  // setting order as cancelled
  let orderId = getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  let order = loadOrder(orderId)
  if (order) {
    order.status = ORDER_STATUS_CANCELLED
    order.save()
  }

  // removing cancelled order from activeOrders array
  let activeOrders: string[] = []
  if (auctionDetails.activeOrders) {
    activeOrders = auctionDetails.activeOrders!
  }
  let index = activeOrders.indexOf(orderId)
  if (index > -1) {
    activeOrders.splice(index, 1)
  }
  auctionDetails.activeOrders = activeOrders
  auctionDetails.activeOrderCount = BigInt.fromI32(activeOrders.length)

  auctionDetails.currentBiddingAmount = auctionDetails.currentBiddingAmount.minus(order.sellAmount)
  auctionDetails.currentSubjectTokenBidAmount = auctionDetails.currentSubjectTokenBidAmount.minus(order.buyAmount)
  auctionDetails.save()

  updateAuctionStats(auctionDetails)

  createOrderTxn(event, orderId, ORDER_STATUS_CANCELLED)
}

// Remove claimed orders
export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  handleClaimedFromOrderTx(event)
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId

  let auctionDetails = loadAuctionDetail(auctionId.toString())

  let orderId = getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  // setting order as claimed
  let order = Order.load(orderId)
  if (!order) {
    log.error("Order not found, orderId: {}  - this txn is not taken into account(TODO:validate)", [orderId])
    return
  }
  if (order) {
    order.status = ORDER_STATUS_CLAIMED
    let amounts = getClaimedAmounts(order, auctionDetails)
    order.refundAmount = amounts[0]
    order.finalizedBuyAmount = amounts[1]
    order.finalizedSellAmount = amounts[2]
    order.finalTxHash = event.transaction.hash
    order.save()
  }

  // Remove order from the list of orders in the activeOrders array
  let activeOrders: string[] = []
  if (auctionDetails.activeOrders) {
    activeOrders = auctionDetails.activeOrders!
  }
  // If orderId is present in the activeOrders array, remove it
  let index = activeOrders.indexOf(orderId)
  if (index > -1) {
    activeOrders.splice(index, 1)
  }
  auctionDetails.activeOrders = activeOrders
  auctionDetails.save()

  // adding order transaction
  createOrderTxn(event, orderId, ORDER_STATUS_CLAIMED)
}

export function handleNewAuction(event: NewAuction): void {
  handleNewAuctionTx(event)
  let eventTimeStamp = event.block.timestamp
  let sellAmount = event.params._auctionedSellAmount
  let buyAmount = event.params._minBuyAmount
  let userId = event.params.userId
  let auctionId = event.params.auctionId
  let addressAuctioningToken = event.params._auctioningToken
  let addressBiddingToken = event.params._biddingToken
  let allowListSigner = event.params.allowListData
  let allowListContract = event.params.allowListContract

  let orderId = getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  let user = loadUser(userId.toString())

  let auctioningTokenDetails = getTokenDetails(addressAuctioningToken)
  let biddingTokenDetails = getTokenDetails(addressBiddingToken)

  let auctionContract = EasyAuction.bind(event.address)
  let isAtomicClosureAllowed = auctionContract.auctionData(auctionId).value11

  let pricePoint = convertToPricePoint(sellAmount, buyAmount, biddingTokenDetails.decimals.toI32(), auctioningTokenDetails.decimals.toI32())

  let isPrivateAuction = !allowListContract.equals(Address.zero())

  let order = new Order(orderId)

  order.auctionId = auctionId
  order.auction = auctionId.toString()
  order.buyAmount = buyAmount
  order.sellAmount = sellAmount
  order.user = user.id
  order.userWalletAddress = user.address
  order.volume = pricePoint.get("volume")
  order.price = ONE.divDecimal(pricePoint.get("price")) // 1/ (sellAmount/buyAmount)
  order.timestamp = eventTimeStamp
  order.status = ORDER_STATUS_PLACED
  order.txHash = event.transaction.hash
  order.blockInfo = getOrCreateBlockInfo(event).id
  order.isExactOrder = true
  order.encodedOrderId = getEncodedOrderId(userId, buyAmount, sellAmount)
  order.lastUpdatedIndex = updateOrderCounter()
  order.finalizedBuyAmount = new BigInt(0)
  order.finalizedSellAmount = new BigInt(0)
  order.refundAmount = new BigInt(0)
  order.save()

  // increasing bid value and total Orders count in summary
  increaseTotalBiddingValueAndOrdersCount(sellAmount, true)
  let auctionDetails = new AuctionDetail(auctionId.toString())
  auctionDetails.auctionId = auctionId
  auctionDetails.exactOrder = order.id

  auctionDetails.auctioningToken = auctioningTokenDetails.id
  auctionDetails.biddingToken = biddingTokenDetails.id

  auctionDetails.auctionEndDate = event.params.auctionEndDate
  auctionDetails.orderCancellationEndDate = event.params.orderCancellationEndDate
  auctionDetails.startingTimeStamp = eventTimeStamp
  auctionDetails.minimumBiddingAmountPerOrder = event.params.minimumBiddingAmountPerOrder
  auctionDetails.minFundingThreshold = event.params.minFundingThreshold
  auctionDetails.allowListManager = event.params.allowListContract
  auctionDetails.allowListSigner = allowListSigner
  auctionDetails.currentClearingPrice = ZERO.toBigDecimal()
  auctionDetails.currentBiddingAmount = new BigInt(0)
  auctionDetails.isAtomicClosureAllowed = isAtomicClosureAllowed
  auctionDetails.isPrivateAuction = isPrivateAuction
  auctionDetails.interestScore = new BigDecimal(new BigInt(0))
  auctionDetails.currentVolume = BigDecimal.fromString("0")
  auctionDetails.currentClearingOrderSellAmount = new BigInt(0)
  auctionDetails.currentClearingOrderBuyAmount = new BigInt(0)
  auctionDetails.currentClearingOrderUserId = new BigDecimal(ZERO)
  auctionDetails.volumeClearingPriceOrder = new BigInt(0)
  auctionDetails.activeOrders = []
  auctionDetails.activeOrderCount = new BigInt(0)
  auctionDetails.minBuyAmount = event.params._minBuyAmount
  auctionDetails.auctionSupply = event.params._auctionedSellAmount
  auctionDetails.minimumPriceInMoxie = order.price

  auctionDetails.uniqueBidders = new BigInt(0)
  auctionDetails.isCleared = false
  auctionDetails.totalOrders = new BigInt(0)
  auctionDetails.currentSubjectTokenBidAmount = new BigInt(0)
  auctionDetails.txHash = event.transaction.hash
  auctionDetails.blockInfo = getOrCreateBlockInfo(event).id
  auctionDetails.save()
  // adding auction to order
  order.auctionId = auctionDetails.auctionId
  order.auction = auctionDetails.id
  order.save()
  // Check if auctionId is present in createdAuction list. If not, add it.
  let createdAuctions = user.createdAuctions
  if (!createdAuctions.includes(auctionId.toString())) {
    createdAuctions.push(auctionId.toString())
    user.createdAuctions = createdAuctions
  }
  user.save()
}

/**
 *	@dev This function is called when a new sell order is placed
 *  OrderID is generated by concatenating auctionId, sellAmount, buyAmount and userId
 */
export function handleNewSellOrder(event: NewSellOrder): void {
  handleNewSellOrderTx(event)
  let auctionId = event.params.auctionId
  let sellAmount = event.params.sellAmount
  let buyAmount = event.params.buyAmount
  let userId = event.params.userId

  // increasing bid value and total Orders count in summary
  increaseTotalBiddingValueAndOrdersCount(sellAmount, false)

  // let user = loadUser(userId.toString()) TODO: revisit after sync
  let user = User.load(userId.toString())
  if (!user) {
    log.error("User not found, userId: {}  - this txn is not taken into account(TODO:validate)", [userId.toString()])
    return
  }

  let auctionDetails = loadAuctionDetail(auctionId.toString())

  let orderId = getOrderEntityId(auctionId, sellAmount, buyAmount, userId)
  let pricePoint = convertToPricePoint(sellAmount, buyAmount, 18, 18)

  let order = new Order(orderId)

  order.buyAmount = buyAmount
  order.sellAmount = sellAmount
  order.user = user.id
  order.price = pricePoint.get("price")
  order.volume = pricePoint.get("volume")
  order.timestamp = event.block.timestamp
  order.auctionId = auctionId
  order.auction = auctionDetails.id
  order.user = user.id
  order.userWalletAddress = user.address
  order.status = ORDER_STATUS_PLACED
  order.txHash = event.transaction.hash
  order.blockInfo = getOrCreateBlockInfo(event).id
  order.isExactOrder = false
  order.encodedOrderId = getEncodedOrderId(userId, buyAmount, sellAmount)
  order.lastUpdatedIndex = updateOrderCounter()
  order.finalizedBuyAmount = new BigInt(0)
  order.finalizedSellAmount = new BigInt(0)
  order.refundAmount = new BigInt(0)
  order.save()

  let activeOrders: string[] = []
  if (auctionDetails.activeOrders) {
    activeOrders = auctionDetails.activeOrders!
  }
  activeOrders.push(order.id)
  auctionDetails.activeOrders = activeOrders
  auctionDetails.activeOrderCount = BigInt.fromI32(activeOrders.length)

  // Check if auctionId is present in participatedAuction list. If not, add it.
  let participatedAuctions = user.participatedAuctions
  if (!participatedAuctions.includes(auctionId.toString())) {
    participatedAuctions.push(auctionId.toString())
    user.participatedAuctions = participatedAuctions
  }
  user.save()
  auctionDetails.currentSubjectTokenBidAmount = auctionDetails.currentSubjectTokenBidAmount.plus(order.buyAmount)
  auctionDetails.currentBiddingAmount = auctionDetails.currentBiddingAmount.plus(order.sellAmount)
  auctionDetails.totalOrders = auctionDetails.totalOrders.plus(ONE)
  auctionDetails.save()

  updateAuctionStats(auctionDetails)

  // adding order transaction
  createOrderTxn(event, orderId, ORDER_STATUS_PLACED)
}

export function handleNewUser(event: NewUser): void {
  handleNewUserTx(event)
  let userId = event.params.userId
  let userAddress = event.params.userAddress
  if (!User.load(userId.toString())) {
    let user = new User(userId.toString())
    user.address = userAddress
    user.createdAuctions = new Array()
    user.participatedAuctions = new Array()
    user.save()
  }
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  handleOwnershipTransferredTx(event)
}

export function handleUserRegistration(event: UserRegistration): void {
  handleUserRegistrationTx(event)
  let userId = event.params.userId
  let userAddress = event.params.user
  if (!User.load(userId.toString())) {
    let user = new User(userId.toString())
    user.address = userAddress
    user.createdAuctions = new Array()
    user.participatedAuctions = new Array()
    user.save()
  }
}
