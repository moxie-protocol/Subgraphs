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

import { newMockEvent } from "matchstick-as"
import {
  AuctionClearedInput,
  CancellationSellOrderInput,
  ClaimedFromOrderInput,
  NewAuctionInput,
  NewSellOrderInput,
  NewUserInput,
  OwnershipTransferredInput,
  UserRegistrationInput,
} from "./types"
import {
  addressValue,
  getAddressEventParam,
  getBigIntEventParam,
  getBooleanEventParam,
  getBytesEventParam,
  getStringEventParam,
} from "./utils"
import { Address, Bytes, ethereum, log } from "@graphprotocol/graph-ts"

export function mockAuctionCleared(input: AuctionClearedInput): AuctionCleared {
  //   preparing event params
  let auctionCleared = changetype<AuctionCleared>(newMockEvent())

  let auctionId = getBigIntEventParam("auctionId", input.auctionId)
  let soldAuctioningTokens = getBigIntEventParam(
    "soldAuctioningTokens",
    input.soldAuctioningTokens
  )
  let soldBiddingTokens = getBigIntEventParam(
    "soldBiddingTokens",
    input.soldBiddingTokens
  )
  let clearingPriceOrder = getBytesEventParam(
    "clearingPriceOrder",
    input.clearingPriceOrder
  )
  auctionCleared.parameters = [
    auctionId,
    soldAuctioningTokens,
    soldBiddingTokens,
    clearingPriceOrder,
  ]
  auctionCleared.transaction.hash = Bytes.fromHexString(input.hash)

  return auctionCleared
}

export function mockCancellationSellOrder(
  input: CancellationSellOrderInput
): CancellationSellOrder {
  //   preparing event params
  let cancellationSellOrder = changetype<CancellationSellOrder>(newMockEvent())
  cancellationSellOrder.transaction.hash = Bytes.fromHexString(input.hash)
  let auctionId = getBigIntEventParam("auctionId", input.auctionId)
  let userId = getBigIntEventParam("userId", input.userId)
  let buyAmount = getBigIntEventParam("buyAmount", input.buyAmount)
  let sellAmount = getBigIntEventParam("sellAmount", input.sellAmount)
  cancellationSellOrder.parameters = [auctionId, userId, buyAmount, sellAmount]
  return cancellationSellOrder
}

export function mockClaimedFromOrder(
  input: ClaimedFromOrderInput
): ClaimedFromOrder {
  //   preparing event params
  let claimedFromOrder = changetype<ClaimedFromOrder>(newMockEvent())
  claimedFromOrder.transaction.hash = Bytes.fromHexString(input.hash)
  let auctionId = getBigIntEventParam("auctionId", input.auctionId)
  let userId = getBigIntEventParam("userId", input.userId)
  let buyAmount = getBigIntEventParam("buyAmount", input.buyAmount)
  let sellAmount = getBigIntEventParam("sellAmount", input.sellAmount)
  claimedFromOrder.parameters = [auctionId, userId, buyAmount, sellAmount]
  return claimedFromOrder
}

export function mockNewAuction(input: NewAuctionInput): NewAuction {
  //   preparing event params
  let newAuction = changetype<NewAuction>(newMockEvent())
  newAuction.transaction.hash = Bytes.fromHexString(input.hash)
  let auctionId = getBigIntEventParam("auctionId", input.auctionId)
  let _auctioningToken = getAddressEventParam(
    "_auctioningToken",
    input._auctioningToken
  )
  let _biddingToken = getAddressEventParam("_biddingToken", input._biddingToken)
  let orderCancellationEndDate = getBigIntEventParam(
    "orderCancellationEndDate",
    input.orderCancellationEndDate
  )
  let auctionEndDate = getBigIntEventParam(
    "auctionEndDate",
    input.auctionEndDate
  )
  let userId = getBigIntEventParam("userId", input.userId)
  let _auctionedSellAmount = getBigIntEventParam(
    "_auctionedSellAmount",
    input._auctionedSellAmount
  )
  let _minBuyAmount = getBigIntEventParam("_minBuyAmount", input._minBuyAmount)
  let minimumBiddingAmountPerOrder = getBigIntEventParam(
    "minimumBiddingAmountPerOrder",
    input.minimumBiddingAmountPerOrder
  )
  let minFundingThreshold = getBigIntEventParam(
    "minFundingThreshold",
    input.minFundingThreshold
  )
  let allowListContract = getAddressEventParam(
    "allowListContract",
    input.allowListContract
  )
  let allowListData = getBytesEventParam("allowListData", input.allowListData)
  newAuction.parameters = [
    auctionId,
    _auctioningToken,
    _biddingToken,
    orderCancellationEndDate,
    auctionEndDate,
    userId,
    _auctionedSellAmount,
    _minBuyAmount,
    minimumBiddingAmountPerOrder,
    minFundingThreshold,
    allowListContract,
    allowListData,
  ]
  return newAuction
}

export function mockNewSellOrder(input: NewSellOrderInput): NewSellOrder {
  //   preparing event params
  let newSellOrder = changetype<NewSellOrder>(newMockEvent())
  newSellOrder.transaction.hash = Bytes.fromHexString(input.hash)
  let auctionId = getBigIntEventParam("auctionId", input.auctionId)
  let userId = getBigIntEventParam("userId", input.userId)
  let buyAmount = getBigIntEventParam("buyAmount", input.buyAmount)
  let sellAmount = getBigIntEventParam("sellAmount", input.sellAmount)
  newSellOrder.parameters = [auctionId, userId, buyAmount, sellAmount]
  return newSellOrder
}

export function mockNewUser(input: NewUserInput): NewUser {
  //   preparing event params
  let newUser = changetype<NewUser>(newMockEvent())
  newUser.transaction.hash = Bytes.fromHexString(input.hash)
  let userId = getBigIntEventParam("userId", input.userId)
  let userAddress = getAddressEventParam("userAddress", input.userAddress)
  newUser.parameters = [userId, userAddress]
  return newUser
}

export function mockOwnershipTransferred(
  input: OwnershipTransferredInput
): OwnershipTransferred {
  //   preparing event params
  let ownershipTransferred = changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferred.transaction.hash = Bytes.fromHexString(input.hash)
  let previousOwner = getAddressEventParam("previousOwner", input.previousOwner)
  let newOwner = getAddressEventParam("newOwner", input.newOwner)
  ownershipTransferred.parameters = [previousOwner, newOwner]
  return ownershipTransferred
}

export function mockUserRegistration(
  input: UserRegistrationInput
): UserRegistration {
  //   preparing event params
  let userRegistration = changetype<UserRegistration>(newMockEvent())
  userRegistration.transaction.hash = Bytes.fromHexString(input.hash)
  let userId = getBigIntEventParam("userId", input.userId)
  let user = getAddressEventParam("user", input.user)
  userRegistration.parameters = [user, userId]
  return userRegistration
}
