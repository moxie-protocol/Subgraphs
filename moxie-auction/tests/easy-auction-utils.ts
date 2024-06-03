import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  AuctionCleared,
  CancellationSellOrder,
  ClaimedFromOrder,
  NewAuction,
  NewSellOrder,
  NewUser,
  OwnershipTransferred,
  UserRegistration
} from "../generated/EasyAuction/EasyAuction"

export function createAuctionClearedEvent(
  auctionId: BigInt,
  soldAuctioningTokens: BigInt,
  soldBiddingTokens: BigInt,
  clearingPriceOrder: Bytes
): AuctionCleared {
  let auctionClearedEvent = changetype<AuctionCleared>(newMockEvent())

  auctionClearedEvent.parameters = new Array()

  auctionClearedEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  auctionClearedEvent.parameters.push(
    new ethereum.EventParam(
      "soldAuctioningTokens",
      ethereum.Value.fromUnsignedBigInt(soldAuctioningTokens)
    )
  )
  auctionClearedEvent.parameters.push(
    new ethereum.EventParam(
      "soldBiddingTokens",
      ethereum.Value.fromUnsignedBigInt(soldBiddingTokens)
    )
  )
  auctionClearedEvent.parameters.push(
    new ethereum.EventParam(
      "clearingPriceOrder",
      ethereum.Value.fromFixedBytes(clearingPriceOrder)
    )
  )

  return auctionClearedEvent
}

export function createCancellationSellOrderEvent(
  auctionId: BigInt,
  userId: BigInt,
  buyAmount: BigInt,
  sellAmount: BigInt
): CancellationSellOrder {
  let cancellationSellOrderEvent = changetype<CancellationSellOrder>(
    newMockEvent()
  )

  cancellationSellOrderEvent.parameters = new Array()

  cancellationSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  cancellationSellOrderEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )
  cancellationSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "buyAmount",
      ethereum.Value.fromUnsignedBigInt(buyAmount)
    )
  )
  cancellationSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "sellAmount",
      ethereum.Value.fromUnsignedBigInt(sellAmount)
    )
  )

  return cancellationSellOrderEvent
}

export function createClaimedFromOrderEvent(
  auctionId: BigInt,
  userId: BigInt,
  buyAmount: BigInt,
  sellAmount: BigInt
): ClaimedFromOrder {
  let claimedFromOrderEvent = changetype<ClaimedFromOrder>(newMockEvent())

  claimedFromOrderEvent.parameters = new Array()

  claimedFromOrderEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  claimedFromOrderEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )
  claimedFromOrderEvent.parameters.push(
    new ethereum.EventParam(
      "buyAmount",
      ethereum.Value.fromUnsignedBigInt(buyAmount)
    )
  )
  claimedFromOrderEvent.parameters.push(
    new ethereum.EventParam(
      "sellAmount",
      ethereum.Value.fromUnsignedBigInt(sellAmount)
    )
  )

  return claimedFromOrderEvent
}

export function createNewAuctionEvent(
  auctionId: BigInt,
  _auctioningToken: Address,
  _biddingToken: Address,
  orderCancellationEndDate: BigInt,
  auctionEndDate: BigInt,
  userId: BigInt,
  _auctionedSellAmount: BigInt,
  _minBuyAmount: BigInt,
  minimumBiddingAmountPerOrder: BigInt,
  minFundingThreshold: BigInt,
  allowListContract: Address,
  allowListData: Bytes
): NewAuction {
  let newAuctionEvent = changetype<NewAuction>(newMockEvent())

  newAuctionEvent.parameters = new Array()

  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "_auctioningToken",
      ethereum.Value.fromAddress(_auctioningToken)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "_biddingToken",
      ethereum.Value.fromAddress(_biddingToken)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "orderCancellationEndDate",
      ethereum.Value.fromUnsignedBigInt(orderCancellationEndDate)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "auctionEndDate",
      ethereum.Value.fromUnsignedBigInt(auctionEndDate)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "_auctionedSellAmount",
      ethereum.Value.fromUnsignedBigInt(_auctionedSellAmount)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "_minBuyAmount",
      ethereum.Value.fromUnsignedBigInt(_minBuyAmount)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "minimumBiddingAmountPerOrder",
      ethereum.Value.fromUnsignedBigInt(minimumBiddingAmountPerOrder)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "minFundingThreshold",
      ethereum.Value.fromUnsignedBigInt(minFundingThreshold)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "allowListContract",
      ethereum.Value.fromAddress(allowListContract)
    )
  )
  newAuctionEvent.parameters.push(
    new ethereum.EventParam(
      "allowListData",
      ethereum.Value.fromBytes(allowListData)
    )
  )

  return newAuctionEvent
}

export function createNewSellOrderEvent(
  auctionId: BigInt,
  userId: BigInt,
  buyAmount: BigInt,
  sellAmount: BigInt
): NewSellOrder {
  let newSellOrderEvent = changetype<NewSellOrder>(newMockEvent())

  newSellOrderEvent.parameters = new Array()

  newSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  newSellOrderEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )
  newSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "buyAmount",
      ethereum.Value.fromUnsignedBigInt(buyAmount)
    )
  )
  newSellOrderEvent.parameters.push(
    new ethereum.EventParam(
      "sellAmount",
      ethereum.Value.fromUnsignedBigInt(sellAmount)
    )
  )

  return newSellOrderEvent
}

export function createNewUserEvent(
  userId: BigInt,
  userAddress: Address
): NewUser {
  let newUserEvent = changetype<NewUser>(newMockEvent())

  newUserEvent.parameters = new Array()

  newUserEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )
  newUserEvent.parameters.push(
    new ethereum.EventParam(
      "userAddress",
      ethereum.Value.fromAddress(userAddress)
    )
  )

  return newUserEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createUserRegistrationEvent(
  user: Address,
  userId: BigInt
): UserRegistration {
  let userRegistrationEvent = changetype<UserRegistration>(newMockEvent())

  userRegistrationEvent.parameters = new Array()

  userRegistrationEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  userRegistrationEvent.parameters.push(
    new ethereum.EventParam("userId", ethereum.Value.fromUnsignedBigInt(userId))
  )

  return userRegistrationEvent
}
