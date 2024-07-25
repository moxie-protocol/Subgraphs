import { BigInt, log } from "@graphprotocol/graph-ts"
import { assert, beforeEach, clearStore, describe, test } from "matchstick-as"
import { Bytes } from "@graphprotocol/graph-ts"
import { _calculateSellSideProtocolAmountAddingBackFees, _calculateSellSideFee, decodeOrder, findClosest } from "../src/utils"
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

  test("test _calculateSellSideProtocolAmountAddingBackFees", () => {
    let protocolSellFeePct = BigInt.fromString("20000000000000000")
    let subjectSellFeePct = BigInt.fromString("40000000000000000")
    let buyAmount = BigInt.fromString("14810226301686662274")
    assert.stringEquals("15755559895411342844", _calculateSellSideProtocolAmountAddingBackFees(protocolSellFeePct, subjectSellFeePct, buyAmount).toString())
  })

  test("test _calculateSellSideFee", () => {
    let protocolSellFeePct = BigInt.fromString("20000000000000000")
    let subjectSellFeePct = BigInt.fromString("40000000000000000")
    let buyAmount = BigInt.fromString("15755559895411342844")
    let fees = _calculateSellSideFee(protocolSellFeePct, subjectSellFeePct, buyAmount)
    assert.stringEquals("315111197908226856", fees.protocolFee.toString())
    assert.stringEquals("630222395816453713", fees.subjectFee.toString())
    assert.stringEquals("14810226301686662274", buyAmount.minus(fees.protocolFee).minus(fees.subjectFee).toString())
  })
})
