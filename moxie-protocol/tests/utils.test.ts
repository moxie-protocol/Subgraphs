import { BigInt, log } from "@graphprotocol/graph-ts"
import { assert, beforeEach, clearStore, describe, test } from "matchstick-as"
import { Bytes } from "@graphprotocol/graph-ts"
import { decodeOrder, findClosest } from "../src/utils"
describe("Decode Order", () => {
  test("test decodeOrder", () => {
    let clearingPriceOrder = Bytes.fromHexString("0x00000000000000040000003635C9ADC5DEA00000000004A89F54EF0121C00000")
    // let clearingPriceOrder = Bytes.fromHexString("0x1")
    // asserts
    let order = decodeOrder(clearingPriceOrder)
    // assert.stringEquals(order.buyAmount.toString(), "100000000000000000000")
    // assert.stringEquals(order.sellAmount.toString(), "100000000000000")
  })
  test("test findClosest", () => {
    let arr: Array<BigInt> = [BigInt.fromI32(2), BigInt.fromI32(1), BigInt.fromI32(3), BigInt.fromI32(5), BigInt.fromI32(4)]
    let closest = findClosest(arr, BigInt.fromI32(3))
    log.warning("closest: {}", [closest.toString()])
  })
})
