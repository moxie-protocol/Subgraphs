import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/MoxieToken/MoxieToken"
import { AuctionCancellationSellOrder, AuctionClaimedFromOrder, AuctionNewSellOrder, AuctionOrder, MoxieTransfer, Order } from "../generated/schema"
import { createUserProtocolOrder, getOrCreateAuctionTransferId, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubject, getOrCreateUser, getTxEntityId, savePortfolio, saveSubject, saveUser } from "./utils"
import { ORDER_TYPE_AUCTION as AUCTION, AUCTION_ORDER_CANCELLED as CANCELLED, AUCTION_ORDER_CLAIMED as CLAIMED, AUCTION_ORDER_PLACED as PLACED } from "./constants"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
}

export function handleTransferTx(event: Transfer): void {
  let blockInfo = getOrCreateBlockInfo(event.block)
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
    order.protocolTokenInvested = new BigDecimal(event.params.value)
    order.auctionOrderStatus = PLACED
    order.subjectToken = auctionNewSellOrder.subject
    // order is just created,will be filling this data later
    order.subjectAmount = BigInt.zero()
    order.subjectAmountLeft = BigInt.zero()
    order.orderType = AUCTION
    let user = getOrCreateUser(event.params.from, event.block)
    order.user = user.id
    order.userProtocolOrderIndex = user.protocolOrdersCount
    // order is just created,will be filling this data later
    order.price = new BigDecimal(BigInt.zero())
    order.blockInfo = blockInfo.id
    // updating user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.from, Address.fromString(auctionNewSellOrder.subject), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(event.params.value))
    savePortfolio(portfolio, event.block)

    order.portfolio = portfolio.id
    order.save()
    createUserProtocolOrder(user, order, event.block)

    user.protocolTokenSpent = user.protocolTokenSpent.plus(event.params.value)
    user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(event.params.value))

    saveUser(user, event.block)

    let subject = getOrCreateSubject(Address.fromString(auctionNewSellOrder.subject), event.block)
    subject.protocolTokenSpent = subject.protocolTokenSpent.plus(event.params.value)
    subject.protocolTokenInvested = subject.protocolTokenInvested.plus(new BigDecimal(event.params.value))
    saveSubject(subject, event.block)
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
    order.auctionOrderStatus = CANCELLED
    order.save()

    // remove order from user's orders
    let user = getOrCreateUser(event.params.to, event.block)
    user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params.value)
    user.protocolTokenInvested = user.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveUser(user, event.block)
    // updating user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionCancellationSellOrder.subject), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.minus(new BigDecimal(event.params.value))

    savePortfolio(portfolio, event.block)

    let subject = getOrCreateSubject(Address.fromString(order.subjectToken), event.block)
    subject.protocolTokenSpent = subject.protocolTokenSpent.minus(event.params.value)
    subject.protocolTokenInvested = subject.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveSubject(subject, event.block)
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
    order.auctionOrderStatus = CLAIMED
    // reducing refund from order's protocolTokenAmount
    order.protocolTokenAmount = order.protocolTokenAmount.minus(event.params.value)
    order.protocolTokenInvested = order.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    order.save()
    // reducing refund amount from user's protocolTokenSpent
    let user = getOrCreateUser(event.params.to, event.block)
    user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params.value)
    saveUser(user, event.block)
    // reducing refund amount from user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionClaimedFromOrder.subject), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.minus(new BigDecimal(event.params.value))

    savePortfolio(portfolio, event.block)
    // reducing refund from subject's protocolTokenSpent
    let subject = getOrCreateSubject(Address.fromString(order.subjectToken), event.block)
    subject.protocolTokenSpent = subject.protocolTokenSpent.minus(event.params.value)
    subject.protocolTokenInvested = subject.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveSubject(subject, event.block)
  }
}

export function getAuctionOrderId(subjectId: string, userId: BigInt, buyAmount: BigInt, sellAmount: BigInt): string {
  return subjectId.concat("-").concat(userId.toString()).concat("-").concat(buyAmount.toString()).concat("-").concat(sellAmount.toString())
}
