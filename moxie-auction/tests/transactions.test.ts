import { describe, test, clearStore, beforeEach, assert } from "matchstick-as/assembly/index"
import { AuctionCleared as AuctionClearedEntity, CancellationSellOrder as CancellationSellOrderEntity, UserRegistration as UserRegistrationEntity, ClaimedFromOrder as ClaimedFromOrderEntity, NewAuction as NewAuctionEntity, NewSellOrder as NewSellOrderEntity, NewUser as NewUserEntity, OwnershipTransferred as OwnershipTransferredEntity } from "../generated/schema"
import { mockAuctionCleared, mockCancellationSellOrder, mockClaimedFromOrder, mockNewAuction, mockNewSellOrder, mockNewUser, mockOwnershipTransferred, mockUserRegistration } from "./mocks"
import { AuctionClearedInput, CancellationSellOrderInput, ClaimedFromOrderInput, NewAuctionInput, NewSellOrderInput, NewUserInput, OwnershipTransferredInput, UserRegistrationInput } from "./types"
import { handleAuctionClearedTx, handleCancellationSellOrderTx, handleClaimedFromOrderTx, handleNewAuctionTx, handleNewSellOrderTx, handleNewUserTx, handleOwnershipTransferredTx, handleUserRegistrationTx } from "../src/transactions"
import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"

describe("transactions", () => {
  beforeEach(() => {
    clearStore()
  })
  test("test handleAuctionClearedTx", () => {
    const sample: AuctionClearedInput = {
      soldBiddingTokens: "30000000",
      soldAuctioningTokens: "15000000000000000",
      hash: "0x0889345580fb47cf4efa2338971dde6a6ed30c654fb02f2f051cb6d0b3d663d7",
      clearingPriceOrder: "0x00000000000000000000000002c68af0bb140000000000000000000017d78400",
      auctionId: "5",
    }
    const event = mockAuctionCleared(sample)
    // calling the handler
    handleAuctionClearedTx(event)
    // asserts
    let createdEntity = AuctionClearedEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.auctionId.toString(), sample.auctionId)
    assert.stringEquals(createdEntity.soldAuctioningTokens.toString(), sample.soldAuctioningTokens)
    assert.stringEquals(createdEntity.soldBiddingTokens.toString(), sample.soldBiddingTokens)
    assert.stringEquals(createdEntity.clearingPriceOrder.toHexString(), sample.clearingPriceOrder)
  })
  test("test handleCancellationSellOrderTx", () => {
    const sample: CancellationSellOrderInput = {
      auctionId: "13",
      buyAmount: "2305188127330847096430",
      hash: "0x0a365eb644cc2b38b8d25394be17aa972b4a94d9c809f27f6f43bdf6309acd2e",
      sellAmount: "1730735246",
      userId: "421",
    }
    const event = mockCancellationSellOrder(sample)
    // calling the handler
    handleCancellationSellOrderTx(event)
    // asserts
    let createdEntity = CancellationSellOrderEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.auctionId.toString(), sample.auctionId)
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.buyAmount.toString(), sample.buyAmount)
    assert.stringEquals(createdEntity.sellAmount.toString(), sample.sellAmount)
  })
  test("test handleClaimedFromOrderTx", () => {
    const sample: ClaimedFromOrderInput = {
      auctionId: "10",
      buyAmount: "544701024612693653",
      hash: "0x0330ee16ad6ecd5918a954b419f94e6e043b096cf94e6681ab23f27504e621a1",
      sellAmount: "1089946750250000000000",
      userId: "20",
    }
    const event = mockClaimedFromOrder(sample)
    // calling the handler
    handleClaimedFromOrderTx(event)
    // asserts
    let createdEntity = ClaimedFromOrderEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.auctionId.toString(), sample.auctionId)
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.buyAmount.toString(), sample.buyAmount)
    assert.stringEquals(createdEntity.sellAmount.toString(), sample.sellAmount)
  })
  test("test handleNewAuctionTx", () => {
    const sample: NewAuctionInput = {
      hash: "0x0f7283e5491001b1077f575e96e96ce9f4eaba9c330d9ec3d647a10395d9f8dd",
      auctionId: "8",
      _auctioningToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      _biddingToken: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      orderCancellationEndDate: "1617704100",
      auctionEndDate: "1617704100",
      userId: "10",
      _auctionedSellAmount: "500000000000000000",
      _minBuyAmount: "1000000000",
      minimumBiddingAmountPerOrder: "1000000",
      minFundingThreshold: "10000000",
      allowListContract: "0x0f4648d997e486ce06577d6ee2fecbca84b834f4",
      allowListData: "0x0000000000000000000000002e173510024d480d195d8875e4d55e9b6198b654",
    }
    const event = mockNewAuction(sample)
    // calling the handler
    handleNewAuctionTx(event)
    // asserts
    let createdEntity = NewAuctionEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.auctionId.toString(), sample.auctionId)
    assert.stringEquals(createdEntity.auctioningToken.toHexString(), sample._auctioningToken)
    assert.stringEquals(createdEntity.biddingToken.toHexString(), sample._biddingToken)
    assert.stringEquals(createdEntity.orderCancellationEndDate.toString(), sample.orderCancellationEndDate)
    assert.stringEquals(createdEntity.auctionEndDate.toString(), sample.auctionEndDate)
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.auctionedSellAmount.toString(), sample._auctionedSellAmount)
    assert.stringEquals(createdEntity.minBuyAmount.toString(), sample._minBuyAmount)
    assert.stringEquals(createdEntity.minimumBiddingAmountPerOrder.toString(), sample.minimumBiddingAmountPerOrder)
    assert.stringEquals(createdEntity.minFundingThreshold.toString(), sample.minFundingThreshold)
    assert.stringEquals(createdEntity.allowListContract.toHexString(), sample.allowListContract)
    assert.stringEquals(createdEntity.allowListData.toHexString(), sample.allowListData)
  })

  test("test handleNewSellOrderTx", () => {
    const sample: NewSellOrderInput = {
      userId: "172",
      sellAmount: "300000000",
      hash: "0x0067bac0da729fa26464d322f60fa11a9443cf3ce0bff1adcb4ea9e581e5e402",
      buyAmount: "348027842227378190255",
      auctionId: "13",
    }
    const event = mockNewSellOrder(sample)
    // calling the handler
    handleNewSellOrderTx(event)
    // asserts
    let createdEntity = NewSellOrderEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.auctionId.toString(), sample.auctionId)
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.buyAmount.toString(), sample.buyAmount)
    assert.stringEquals(createdEntity.sellAmount.toString(), sample.sellAmount)
  })
  test("test handleNewUserTx", () => {
    const sample: NewUserInput = {
      userId: "172",
      userAddress: "0xca5499ff9d87048960005cdcb8a197e98d9200ec",
      hash: "0x0067bac0da729fa26464d322f60fa11a9443cf3ce0bff1adcb4ea9e581e5e402",
    }
    const event = mockNewUser(sample)
    // calling the handler
    handleNewUserTx(event)
    // asserts
    let createdEntity = NewUserEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.userAddress.toHexString(), sample.userAddress)
  })
  test("test handleOwnershipTransferredTx", () => {
    const sample: OwnershipTransferredInput = {
      previousOwner: "0x8ab8530aee3e5ed7ecf5d7ca69c903ed04595094",
      newOwner: "0x0da0c3e52c977ed3cbc641ff02dd271c3ed55afe",
      hash: "0x913ffc80141d4f8a33d861123d31e4d3249e627ed13335bff9c0a07380e229b0",
    }
    const event = mockOwnershipTransferred(sample)
    // calling the handler
    handleOwnershipTransferredTx(event)
    // asserts
    let createdEntity = OwnershipTransferredEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.previousOwner.toHexString(), sample.previousOwner)
    assert.stringEquals(createdEntity.newOwner.toHexString(), sample.newOwner)
  })
  test("test handleUserRegistrationTx", () => {
    const sample: UserRegistrationInput = {
      user: "0xca5499ff9d87048960005cdcb8a197e98d9200ec",
      userId: "172",
      hash: "0x0067bac0da729fa26464d322f60fa11a9443cf3ce0bff1adcb4ea9e581e5e402",
    }
    const event = mockUserRegistration(sample)
    // calling the handler
    handleUserRegistrationTx(event)
    // asserts
    let createdEntity = UserRegistrationEntity.load(sample.hash)!
    assert.stringEquals(createdEntity.userId.toString(), sample.userId)
    assert.stringEquals(createdEntity.user.toHexString(), sample.user)
  })
})
