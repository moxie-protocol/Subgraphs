import {
  describe,
  test,
  clearStore,
  beforeEach,
  assert,
} from "matchstick-as/assembly/index"
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
  mockAuctionCleared,
  mockCancellationSellOrder,
  mockClaimedFromOrder,
  mockNewAuction,
  mockNewSellOrder,
  mockNewUser,
  mockOwnershipTransferred,
  mockUserRegistration,
} from "./mocks"
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
  handleAuctionClearedTx,
  handleCancellationSellOrderTx,
  handleClaimedFromOrderTx,
  handleNewAuctionTx,
  handleNewSellOrderTx,
  handleNewUserTx,
  handleOwnershipTransferredTx,
  handleUserRegistrationTx,
} from "../src/transactions"
import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { sortOrders } from "../src/utils/sortOrders"
import { convertToPricePoint } from "../src/utils"
describe("utils", () => {
  beforeEach(() => {
    clearStore()
  })
  describe("sortOrders", () => {
    test("test sortOrders", () => {
      let orders: Array<string> = [
        "2-200-100-2",
        "1-100-100-1",
        "4-400-100-4",
        "3-300-100-3",
      ]
      let sortedOrders = sortOrders(orders)
      // user sells 100 moxies to buy 100 fan token , price of fan token is 1
      assert.stringEquals(sortedOrders[0], "1-100-100-1")
      // user sells 200 moxies to buy 100 fan token , price of fan token is 2
      assert.stringEquals(sortedOrders[1], "2-200-100-2")
      // user sells 300 moxies to buy 100 fan token , price of fan token is 3
      assert.stringEquals(sortedOrders[2], "3-300-100-3")
      // user sells 400 moxies to buy 100 fan token , price of fan token is 4
      assert.stringEquals(sortedOrders[3], "4-400-100-4")
    })
    test("test sortOrders 2", () => {
      let orders: Array<string> = [
        "2-100-200-2",
        "1-100-100-1",
        "4-100-400-4",
        "3-100-300-3",
      ]
      let sortedOrders = sortOrders(orders)
      // user sells 100 moxies to buy 400 fan token , price of fan token is 0.25
      assert.stringEquals(sortedOrders[0], "4-100-400-4")
      // user sells 100 moxies to buy 300 fan token , price of fan token is 0.33
      assert.stringEquals(sortedOrders[1], "3-100-300-3")
      // user sells 100 moxies to buy 200 fan token , price of fan token is 0.5
      assert.stringEquals(sortedOrders[2], "2-100-200-2")
      // user sells 100 moxies to buy 100 fan token , price of fan token is 1
      assert.stringEquals(sortedOrders[3], "1-100-100-1")
    })
  })
  describe("convertToPricePoint", () => {
    test("test convertToPricePoint", () => {
      // user wants to sell 100 moxies to buy 200 fan token
      // calculated price of fan token is 0.5
      let pricePoint = convertToPricePoint(
        BigInt.fromString("100"),
        BigInt.fromString("200"),
        18,
        18
      )
      assert.stringEquals(pricePoint!.get("price")!.toString(), "0.5")
      // 100 * 10 ^ -18
      assert.stringEquals(
        pricePoint!.get("volume")!.toString(),
        "0.0000000000000001"
      )
    })

    test("test convertToPricePoint 2", () => {
      // user wants to sell 100 moxies to buy 200 fan token
      // calculated price of fan token is 0.5
      let pricePoint = convertToPricePoint(
        BigInt.fromString("1"),
        BigInt.fromString("200"),
        3,
        18
      )
      assert.stringEquals(pricePoint!.get("price")!.toString(), "0.5")
      // 100 * 10 ^ -18
      assert.stringEquals(
        pricePoint!.get("volume")!.toString(),
        "0.0000000000000001"
      )
    })
  })
})
