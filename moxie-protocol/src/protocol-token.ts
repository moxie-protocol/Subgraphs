import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/MoxieToken/MoxieToken"
import { AuctionCancellationSellOrder, AuctionClaimedFromOrder, AuctionNewSellOrder, AuctionOrder, MoxieTransfer, Order } from "../generated/schema"
import { createUserProtocolOrder, getOrCreateAuctionTransferId, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateUser, getTxEntityId } from "./utils"
import { AUCTION_ORDER_STATUS, AUCTION_ORDER_TYPE } from "./constants"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
}

export function handleTransferTx(event: Transfer): void {
  let blockInfo = getOrCreateBlockInfo(event)
  let transfer = new MoxieTransfer(getTxEntityId(event))
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.blockInfo = blockInfo.id
  transfer.txHash = getOrCreateAuctionTransferId(event.transaction.hash)
  transfer.save()
  // prepare auction entityId
  let auctionLogIndex = event.logIndex.minus(BigInt.fromI32(1))
  let entityId = event.transaction.hash.toHexString().concat("-").concat(auctionLogIndex.toString())
  let auctionNewSellOrder = AuctionNewSellOrder.load(entityId)
  if (auctionNewSellOrder) {
    // creating new Order
    let order = new Order(entityId)
    order.protocolToken = event.address
    order.protocolTokenAmount = event.params.value
    order.protocolTokenInvestment = new BigDecimal(event.params.value)
    order.auctionOrderStatus = AUCTION_ORDER_STATUS.PLACED
    order.subjectToken = auctionNewSellOrder.subject
    // order is just created,will be filling this data later
    order.subjectAmount = BigInt.zero()
    order.subjectAmountLeft = BigInt.zero()
    order.orderType = AUCTION_ORDER_TYPE.AUCTION
    let user = getOrCreateUser(event.params.from)
    order.user = user.id
    order.userProtocolOrderIndex = user.protocolOrdersCount
    // order is just created,will be filling this data later
    order.price = new BigDecimal(BigInt.zero())
    order.blockInfo = blockInfo.id
    // updating user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.from, Address.fromString(auctionNewSellOrder.subject), event.transaction.hash)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params.value)
    portfolio.protocolTokenInvestment = portfolio.protocolTokenInvestment.plus(new BigDecimal(event.params.value))
    portfolio.save()

    order.portfolio = portfolio.id
    order.save()
    createUserProtocolOrder(user, order)

    user.protocolTokenSpent = user.protocolTokenSpent.plus(event.params.value)
    user.protocolTokenInvestment = user.protocolTokenInvestment.plus(new BigDecimal(event.params.value))

    user.save()

    // creating AuctionOrder entity so that other auction events can refer this existing order
    let auctionOrder = new AuctionOrder(getAuctionOrderId(auctionNewSellOrder.subject, auctionNewSellOrder.userId, auctionNewSellOrder.buyAmount, auctionNewSellOrder.sellAmount))
    auctionOrder.order = order.id
    auctionOrder.auctionNewSellOrder = auctionNewSellOrder.id
    auctionOrder.save()
  }
  let auctionCancellationSellOrder = AuctionCancellationSellOrder.load(entityId)
  if (auctionCancellationSellOrder) {
    // load respective order
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionCancellationSellOrder.subject, auctionCancellationSellOrder.userId, auctionCancellationSellOrder.buyAmount, auctionCancellationSellOrder.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during auctionCancellationSellOrder: " + entityId)
    }
    auctionOrder.auctionCancellationSellOrder = auctionCancellationSellOrder.id
    auctionOrder.save()

    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for auctionOrder during auctionCancellationSellOrder: " + auctionOrder.order)
    }
    order.auctionOrderStatus = AUCTION_ORDER_STATUS.CANCELLED
    order.save()

    // remove order from user's orders
    let user = getOrCreateUser(event.params.to)
    user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params.value)
    // TODO: reduce protocolTokenInvestment
    user.save()
    // updating user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionCancellationSellOrder.subject), event.transaction.hash)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvestment = portfolio.protocolTokenInvestment.minus(new BigDecimal(event.params.value))

    portfolio.save()
  }
  let auctionClaimedFromOrder = AuctionClaimedFromOrder.load(entityId)
  if (auctionClaimedFromOrder) {
    // load respective order
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionClaimedFromOrder.subject, auctionClaimedFromOrder.userId, auctionClaimedFromOrder.buyAmount, auctionClaimedFromOrder.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during auctionClaimedFromOrder: " + entityId)
    }
    auctionOrder.auctionClaimedFromOrder = auctionClaimedFromOrder.id
    auctionOrder.save()
    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for auctionOrder during auctionClaimedFromOrder: " + auctionOrder.order)
    }
    order.auctionOrderStatus = AUCTION_ORDER_STATUS.CLAIMED
    // reducing refund from order's protocolTokenAmount
    order.protocolTokenAmount = order.protocolTokenAmount.minus(event.params.value)
    // TODO: reducing refund from order's protocolTokenInvestment
    order.save()
    // reducing refund amount from user's protocolTokenSpent
    let user = getOrCreateUser(event.params.to)
    user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params.value)
    user.save()
    // reducing refund amount from user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionClaimedFromOrder.subject), event.transaction.hash)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvestment = portfolio.protocolTokenInvestment.minus(new BigDecimal(event.params.value))

    portfolio.save()
  }
}

export function getAuctionOrderId(subjectId: string, userId: BigInt, buyAmount: BigInt, sellAmount: BigInt): string {
  return subjectId.concat("-").concat(userId.toString()).concat("-").concat(buyAmount.toString()).concat("-").concat(sellAmount.toString())
}
