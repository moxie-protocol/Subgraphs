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
import {
  // AuctionDetail,
  // User,
  AuctionCleared as AuctionClearedEntity,
  CancellationSellOrder as CancellationSellOrderEntity,
  UserRegistration as UserRegistrationEntity,
  ClaimedFromOrder as ClaimedFromOrderEntity,
  NewAuction as NewAuctionEntity,
  NewSellOrder as NewSellOrderEntity,
  NewUser as NewUserEntity,
  OwnershipTransferred as OwnershipTransferredEntity,
} from "../generated/schema"
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
import {
  _handleAuctionCleared,
  _handleCancellationSellOrder,
  _handleClaimedFromOrder,
  _handleNewAuction,
  _handleNewSellOrder,
  _handleNewUser,
} from "./example"

export function handleAuctionCleared(event: AuctionCleared): void {
  _handleAuctionCleared(event)
  let auctionCleared = new AuctionClearedEntity(
    event.transaction.hash.toHexString()
  )
  auctionCleared.auctionId = event.params.auctionId
  auctionCleared.soldAuctioningTokens = event.params.soldAuctioningTokens
  auctionCleared.soldBiddingTokens = event.params.soldBiddingTokens
  auctionCleared.clearingPriceOrder = event.params.clearingPriceOrder
  auctionCleared.save()
}

export function handleCancellationSellOrder(
  event: CancellationSellOrder
): void {
  _handleCancellationSellOrder(event)
  let cancellationSellOrder = new CancellationSellOrderEntity(
    event.transaction.hash.toHexString()
  )
  cancellationSellOrder.auctionId = event.params.auctionId
  cancellationSellOrder.userId = event.params.userId
  cancellationSellOrder.buyAmount = event.params.buyAmount
  cancellationSellOrder.sellAmount = event.params.sellAmount
  cancellationSellOrder.save()
}

// Remove claimed orders
export function handleClaimedFromOrder(event: ClaimedFromOrder): void {
  _handleClaimedFromOrder(event)
  let claimedFromOrder = new ClaimedFromOrderEntity(
    event.transaction.hash.toHexString()
  )
  claimedFromOrder.auctionId = event.params.auctionId
  claimedFromOrder.userId = event.params.userId
  claimedFromOrder.buyAmount = event.params.buyAmount
  claimedFromOrder.sellAmount = event.params.sellAmount
  claimedFromOrder.save()
}

export function handleNewAuction(event: NewAuction): void {
  _handleNewAuction(event)
  let newAuction = new NewAuctionEntity(event.transaction.hash.toHexString())
  newAuction.auctionId = event.params.auctionId
  newAuction.auctioningToken = event.params._auctioningToken
  newAuction.biddingToken = event.params._biddingToken
  newAuction.orderCancellationEndDate = event.params.orderCancellationEndDate
  newAuction.auctionEndDate = event.params.auctionEndDate
  newAuction.userId = event.params.userId
  newAuction.auctionedSellAmount = event.params._auctionedSellAmount
  newAuction.minBuyAmount = event.params._minBuyAmount
  newAuction.minimumBiddingAmountPerOrder =
    event.params.minimumBiddingAmountPerOrder
  newAuction.minFundingThreshold = event.params.minFundingThreshold
  newAuction.allowListContract = event.params.allowListContract
  newAuction.allowListData = event.params.allowListData
  newAuction.save()
}

export function handleNewSellOrder(event: NewSellOrder): void {
  _handleNewSellOrder(event)
  let newSellOrder = new NewSellOrderEntity(
    event.transaction.hash.toHexString()
  )
  newSellOrder.auctionId = event.params.auctionId
  newSellOrder.userId = event.params.userId
  newSellOrder.buyAmount = event.params.buyAmount
  newSellOrder.sellAmount = event.params.sellAmount
  newSellOrder.save()
}

export function handleNewUser(event: NewUser): void {
  _handleNewUser(event)
  let newUser = new NewUserEntity(event.transaction.hash.toHexString())
  newUser.userId = event.params.userId
  newUser.userAddress = event.params.userAddress
  newUser.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let ownershipTransferred = new OwnershipTransferredEntity(
    event.transaction.hash.toHexString()
  )
  ownershipTransferred.newOwner = event.params.newOwner
  ownershipTransferred.previousOwner = event.params.previousOwner
  ownershipTransferred.save()
}

export function handleUserRegistration(event: UserRegistration): void {
  let userRegistration = new UserRegistrationEntity(
    event.transaction.hash.toHexString()
  )
  userRegistration.userId = event.params.userId
  userRegistration.user = event.params.user
  userRegistration.save()
}
