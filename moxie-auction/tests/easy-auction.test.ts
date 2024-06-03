import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { ExampleEntity } from "../generated/schema"
import { AuctionCleared } from "../generated/EasyAuction/EasyAuction"
import { handleAuctionCleared } from "../src/easy-auction"
import { createAuctionClearedEvent } from "./easy-auction-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let auctionId = BigInt.fromI32(234)
    let soldAuctioningTokens = BigInt.fromI32(234)
    let soldBiddingTokens = BigInt.fromI32(234)
    let clearingPriceOrder = Bytes.fromI32(1234567890)
    let newAuctionClearedEvent = createAuctionClearedEvent(
      auctionId,
      soldAuctioningTokens,
      soldBiddingTokens,
      clearingPriceOrder
    )
    handleAuctionCleared(newAuctionClearedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ExampleEntity created and stored", () => {
    assert.entityCount("ExampleEntity", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ExampleEntity",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
      "auctionId",
      "234"
    )
    assert.fieldEquals(
      "ExampleEntity",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
      "soldAuctioningTokens",
      "234"
    )
    assert.fieldEquals(
      "ExampleEntity",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
      "soldBiddingTokens",
      "234"
    )
    assert.fieldEquals(
      "ExampleEntity",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
      "clearingPriceOrder",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
