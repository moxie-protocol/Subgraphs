import {
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

export function handleAuctionClearedTx(event: AuctionCleared): void {
  let auctionCleared = new AuctionClearedEntity(
    event.transaction.hash.toHexString()
  )
  auctionCleared.auctionId = event.params.auctionId
  auctionCleared.soldAuctioningTokens = event.params.soldAuctioningTokens
  auctionCleared.soldBiddingTokens = event.params.soldBiddingTokens
  auctionCleared.clearingPriceOrder = event.params.clearingPriceOrder
  auctionCleared.save()
}

export function handleCancellationSellOrderTx(
  event: CancellationSellOrder
): void {
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
export function handleClaimedFromOrderTx(event: ClaimedFromOrder): void {
  let claimedFromOrder = new ClaimedFromOrderEntity(
    event.transaction.hash.toHexString()
  )
  claimedFromOrder.auctionId = event.params.auctionId
  claimedFromOrder.userId = event.params.userId
  claimedFromOrder.buyAmount = event.params.buyAmount
  claimedFromOrder.sellAmount = event.params.sellAmount
  claimedFromOrder.save()
}

export function handleNewAuctionTx(event: NewAuction): void {
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

export function handleNewSellOrderTx(event: NewSellOrder): void {
  let newSellOrder = new NewSellOrderEntity(
    event.transaction.hash.toHexString()
  )
  newSellOrder.auctionId = event.params.auctionId
  newSellOrder.userId = event.params.userId
  newSellOrder.buyAmount = event.params.buyAmount
  newSellOrder.sellAmount = event.params.sellAmount
  newSellOrder.save()
}

export function handleNewUserTx(event: NewUser): void {
  let newUser = new NewUserEntity(event.transaction.hash.toHexString())
  newUser.userId = event.params.userId
  newUser.userAddress = event.params.userAddress
  newUser.save()
}

export function handleOwnershipTransferredTx(
  event: OwnershipTransferred
): void {
  let ownershipTransferred = new OwnershipTransferredEntity(
    event.transaction.hash.toHexString()
  )
  ownershipTransferred.newOwner = event.params.newOwner
  ownershipTransferred.previousOwner = event.params.previousOwner
  ownershipTransferred.save()
}

export function handleUserRegistrationTx(event: UserRegistration): void {
  let userRegistration = new UserRegistrationEntity(
    event.transaction.hash.toHexString()
  )
  userRegistration.userId = event.params.userId
  userRegistration.user = event.params.user
  userRegistration.save()
}
