import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateSummary, savePortfolio, saveSubjectToken } from "./utils"
import { AuctionClaimedFromOrderTx, AuctionOrder, Order } from "../generated/schema"
import { getAuctionOrderId } from "./protocol-token"
import { AUCTION_ORDER_CLAIMED as CLAIMED } from "./constants"

export function handleTransfer(event: Transfer): void {
  let contractAddress = event.address
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubjectToken(contractAddress, null, event.block)
  let totalSupply = subjectToken.totalSupply
  let summary = getOrCreateSummary()
  let mint = from == Address.zero()
  if (mint) {
    // minting
    totalSupply = totalSupply.plus(value)
    summary.totalSubjectTokensIssued = summary.totalSubjectTokensIssued.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
    summary.totalSubjectTokensIssued = summary.totalSubjectTokensIssued.minus(value)
  }
  summary.save()
  subjectToken.totalSupply = totalSupply

  // updating portfolios
  if (!mint) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    fromAddressPortfolio.balance = fromAddressPortfolio.balance.minus(value)
    savePortfolio(fromAddressPortfolio, event.block)
    if (fromAddressPortfolio.balance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.minus(BigInt.fromI32(1))
      store.remove("Portfolio", fromAddressPortfolio.id)
    }
  }
  if (!burn) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    // adding unique holders when a new portfolio is created
    if (toAddressPortfolio.balance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.plus(BigInt.fromI32(1))
    }
    toAddressPortfolio.balance = toAddressPortfolio.balance.plus(value)
    savePortfolio(toAddressPortfolio, event.block)
  }
  saveSubjectToken(subjectToken, event.block)

  // trying to load auction order
  let auctionClaimedFromOrder = tryLoadAuctionClaimedFromOrder(event)
  if (auctionClaimedFromOrder) {
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionClaimedFromOrder.subjectToken, auctionClaimedFromOrder.userId, auctionClaimedFromOrder.buyAmount, auctionClaimedFromOrder.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during subject token transfer: " + event.transaction.hash.toHexString())
    }
    auctionOrder.auctionClaimedFromOrderTx = auctionClaimedFromOrder.id
    auctionOrder.save()
    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for entityId during subject token transfer: " + event.transaction.hash.toHexString())
    }
    order.subjectAmount = value
    order.price = order.protocolTokenAmount.divDecimal(new BigDecimal(value))
    order.auctionOrderStatus = CLAIMED
    order.save()

    let portfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(value)
    savePortfolio(portfolio, event.block)
  }
}

function tryLoadAuctionClaimedFromOrder(event: Transfer): AuctionClaimedFromOrderTx | null {
  let noRefundLogIndex = event.logIndex.minus(BigInt.fromI32(1))
  let entityId = event.transaction.hash.toHexString().concat("-").concat(noRefundLogIndex.toString())
  let auctionClaimOrder = AuctionClaimedFromOrderTx.load(entityId)
  if (!auctionClaimOrder) {
    let withRefundLogIndex = event.logIndex.minus(BigInt.fromI32(2))
    entityId = event.transaction.hash.toHexString().concat("-").concat(withRefundLogIndex.toString())
    auctionClaimOrder = AuctionClaimedFromOrderTx.load(entityId)
  }
  return auctionClaimOrder
}
