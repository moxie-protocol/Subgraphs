import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/MoxieToken/MoxieToken"
import { AuctionCancellationSellOrderTx, AuctionClaimedFromOrderTx, AuctionNewSellOrderTx, AuctionOrder, MoxieTransferTx, Order } from "../generated/schema"
import { createUserProtocolOrder, getOrCreateTransactionId, getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateUser, getTxEntityId, getOrCreateSummary, savePortfolio, saveSubjectToken, saveUser } from "./utils"
import { ORDER_TYPE_AUCTION as AUCTION, AUCTION_ORDER_CANCELLED as CANCELLED, AUCTION_ORDER_CLAIMED as CLAIMED, AUCTION_ORDER_PLACED as PLACED } from "./constants"

export function handleTransferTx(event: Transfer): void {
  let transfer = new MoxieTransferTx(getTxEntityId(event))
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.txHash = event.transaction.hash
  transfer.txn = getOrCreateTransactionId(event.transaction.hash)
  transfer.save()
}

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
  let blockInfo = getOrCreateBlockInfo(event.block)
  // prepare auction entityId
  let auctionLogIndex = event.logIndex.minus(BigInt.fromI32(1))
  let entityId = event.transaction.hash.toHexString().concat("-").concat(auctionLogIndex.toString())
  let auctionNewSellOrderTx = AuctionNewSellOrderTx.load(entityId)
  if (auctionNewSellOrderTx) {
    // creating new Order
    let order = new Order(entityId)
    order.protocolToken = event.address
    order.protocolTokenAmount = event.params.value
    order.protocolTokenInvested = new BigDecimal(event.params.value)
    order.auctionOrderStatus = PLACED
    order.subjectToken = auctionNewSellOrderTx.subjectToken
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
    let portfolio = getOrCreatePortfolio(event.params.from, Address.fromString(auctionNewSellOrderTx.subjectToken), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.plus(new BigDecimal(event.params.value))
    savePortfolio(portfolio, event.block)

    order.portfolio = portfolio.id
    order.save()
    createUserProtocolOrder(user, order, event.block)

    user.protocolTokenSpent = user.protocolTokenSpent.plus(event.params.value)
    user.protocolTokenInvested = user.protocolTokenInvested.plus(new BigDecimal(event.params.value))

    saveUser(user, event.block)

    let subjectToken = getOrCreateSubjectToken(Address.fromString(auctionNewSellOrderTx.subjectToken), null, event.block)
    subjectToken.protocolTokenSpent = subjectToken.protocolTokenSpent.plus(event.params.value)
    subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.plus(new BigDecimal(event.params.value))
    saveSubjectToken(subjectToken, event.block)

    let summary = getOrCreateSummary()
    summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.plus(new BigDecimal(event.params.value))
    summary.save()

    // creating AuctionOrder entity so that other auction events can refer this existing order
    let auctionOrder = new AuctionOrder(getAuctionOrderId(auctionNewSellOrderTx.subjectToken, auctionNewSellOrderTx.userId, auctionNewSellOrderTx.buyAmount, auctionNewSellOrderTx.sellAmount))
    auctionOrder.order = order.id
    auctionOrder.auctionNewSellOrderTx = auctionNewSellOrderTx.id
    auctionOrder.save()
  }
  let auctionCancellationSellOrderTx = AuctionCancellationSellOrderTx.load(entityId)
  if (auctionCancellationSellOrderTx) {
    // load respective order
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionCancellationSellOrderTx.subjectToken, auctionCancellationSellOrderTx.userId, auctionCancellationSellOrderTx.buyAmount, auctionCancellationSellOrderTx.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during auctionCancellationSellOrderTx: " + entityId)
    }
    auctionOrder.auctionCancellationSellOrderTx = auctionCancellationSellOrderTx.id
    auctionOrder.save()

    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for auctionOrder during auctionCancellationSellOrderTx: " + auctionOrder.order)
    }
    order.auctionOrderStatus = CANCELLED
    order.save()

    // remove order from user's orders
    let user = getOrCreateUser(event.params.to, event.block)
    user.protocolTokenSpent = user.protocolTokenSpent.minus(event.params.value)
    user.protocolTokenInvested = user.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveUser(user, event.block)
    // updating user's portfolio
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionCancellationSellOrderTx.subjectToken), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.minus(new BigDecimal(event.params.value))

    savePortfolio(portfolio, event.block)

    let subjectToken = getOrCreateSubjectToken(Address.fromString(order.subjectToken), null, event.block)
    subjectToken.protocolTokenSpent = subjectToken.protocolTokenSpent.minus(event.params.value)
    subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveSubjectToken(subjectToken, event.block)

    let summary = getOrCreateSummary()
    summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.minus(new BigDecimal(event.params.value))
    summary.save()
  }
  let auctionClaimedFromOrderTx = AuctionClaimedFromOrderTx.load(entityId)
  if (auctionClaimedFromOrderTx) {
    // load respective order
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionClaimedFromOrderTx.subjectToken, auctionClaimedFromOrderTx.userId, auctionClaimedFromOrderTx.buyAmount, auctionClaimedFromOrderTx.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during auctionClaimedFromOrderTx: " + entityId)
    }
    auctionOrder.auctionClaimedFromOrderTx = auctionClaimedFromOrderTx.id
    auctionOrder.save()
    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for auctionOrder during auctionClaimedFromOrderTx: " + auctionOrder.order)
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
    let portfolio = getOrCreatePortfolio(event.params.to, Address.fromString(auctionClaimedFromOrderTx.subjectToken), event.transaction.hash, event.block)
    portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params.value)
    portfolio.protocolTokenInvested = portfolio.protocolTokenInvested.minus(new BigDecimal(event.params.value))

    savePortfolio(portfolio, event.block)
    // reducing refund from subject's protocolTokenSpent
    let subjectToken = getOrCreateSubjectToken(Address.fromString(order.subjectToken), null, event.block)
    subjectToken.protocolTokenSpent = subjectToken.protocolTokenSpent.minus(event.params.value)
    subjectToken.protocolTokenInvested = subjectToken.protocolTokenInvested.minus(new BigDecimal(event.params.value))
    saveSubjectToken(subjectToken, event.block)

    let summary = getOrCreateSummary()
    summary.totalProtocolTokenInvested = summary.totalProtocolTokenInvested.minus(new BigDecimal(event.params.value))
    summary.save()
  }
}

export function getAuctionOrderId(subjectId: string, userId: BigInt, buyAmount: BigInt, sellAmount: BigInt): string {
  return subjectId.concat("-").concat(userId.toString()).concat("-").concat(buyAmount.toString()).concat("-").concat(sellAmount.toString())
}
