import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubject, loadSummary, savePortfolio, saveSubject } from "./utils"
import { handleTransferTx } from "./subject-token-tx"
import { AuctionClaimedFromOrder, AuctionOrder, Order, User } from "../generated/schema"
import { getAuctionOrderId } from "./protocol-token"
import { AUCTION_ORDER_CLAIMED as CLAIMED } from "./constants"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
  let contractAddress = event.address
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubject(contractAddress, event.block)
  let totalSupply = subjectToken.totalSupply
  let summary = loadSummary()
  let mint = from == Address.zero()
  if (mint) {
    // minting
    totalSupply = totalSupply.plus(value)
    summary.totalTokensIssued = summary.totalTokensIssued.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
    summary.totalTokensIssued = summary.totalTokensIssued.minus(value)
  }
  summary.save()
  subjectToken.totalSupply = totalSupply
  // updating holders
  let toAddressString = to.toHexString()
  if (!burn) {
    let uniqueHoldersCount = BigInt.fromI32(0)
    let holders = subjectToken.holders
    // checking if to address is already in holders list
    if (!holders.includes(toAddressString)) {
      holders.push(toAddressString)
      for (let i = 0; i < holders.length; i++) {
        let user = User.load(holders[i])
        if (user) {
          uniqueHoldersCount = uniqueHoldersCount.plus(BigInt.fromI32(1))
        }
      }
      subjectToken.holders = holders
      subjectToken.uniqueHolders = uniqueHoldersCount
    }
  }
  saveSubject(subjectToken, event.block)
  // updating portfolios
  if (!mint) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    fromAddressPortfolio.balance = fromAddressPortfolio.balance.minus(value)
    savePortfolio(fromAddressPortfolio, event.block)
  }
  if (!burn) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    toAddressPortfolio.balance = toAddressPortfolio.balance.plus(value)
    savePortfolio(toAddressPortfolio, event.block)
  }

  // trying to load auction order
  let auctionClaimedFromOrder = tryLoadAuctionClaimedFromOrder(event)
  if (auctionClaimedFromOrder) {
    let auctionOrder = AuctionOrder.load(getAuctionOrderId(auctionClaimedFromOrder.subject, auctionClaimedFromOrder.userId, auctionClaimedFromOrder.buyAmount, auctionClaimedFromOrder.sellAmount))
    if (!auctionOrder) {
      throw new Error("AuctionOrder not found for entityId during subject token transfer: " + event.transaction.hash.toHexString())
    }
    auctionOrder.auctionClaimedFromOrder = auctionClaimedFromOrder.id
    auctionOrder.save()
    let order = Order.load(auctionOrder.order)
    if (!order) {
      throw new Error("Order not found for entityId during subject token transfer: " + event.transaction.hash.toHexString())
    }
    order.subjectAmount = value
    order.subjectAmountLeft = value
    order.price = order.protocolTokenAmount.divDecimal(new BigDecimal(value))
    order.auctionOrderStatus = CLAIMED
    order.save()
  }
}

function tryLoadAuctionClaimedFromOrder(event: Transfer): AuctionClaimedFromOrder | null {
  let noRefundLogIndex = event.logIndex.minus(BigInt.fromI32(1))
  let entityId = event.transaction.hash.toHexString().concat("-").concat(noRefundLogIndex.toString())
  let auctionClaimOrder = AuctionClaimedFromOrder.load(entityId)
  if (!auctionClaimOrder) {
    let withRefundLogIndex = event.logIndex.minus(BigInt.fromI32(2))
    entityId = event.transaction.hash.toHexString().concat("-").concat(withRefundLogIndex.toString())
    auctionClaimOrder = AuctionClaimedFromOrder.load(entityId)
  }
  return auctionClaimOrder
}
