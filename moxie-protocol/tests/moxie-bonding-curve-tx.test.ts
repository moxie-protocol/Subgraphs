import { assert, beforeEach, clearStore, describe, test } from "matchstick-as"
import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import {
  MoxieBondingCurveSubjectSharePurchasedTx,
  MoxieBondingCurveSubjectShareSoldTx,
  MoxieBondingCurveBondingCurveInitializedTx,
} from "../generated/schema"
import {
  MoxieBondingCurveBondingCurveInitializedInput,
  MoxieBondingCurveSubjectSharePurchasedInput,
  MoxieBondingCurveSubjectShareSoldInput,
} from "./utils/types"
import {
  handleBondingCurveInitializedTx,
  handleSubjectSharePurchasedTx,
  handleSubjectShareSoldTx,
  handleUpdateBeneficiaryTx,
  handleUpdateFeesTx,
  handleUpdateFormulaTx,
} from "../src/moxie-bonding-curve-tx"
import {
  mockBondingCurveInitialized,
  mockSubjectSharePurchased,
  mockSubjectShareSold,
} from "./utils/moxie-bonding-curve-mock"

export function callhandleBondingCurveInitializedTx(
  sample: MoxieBondingCurveBondingCurveInitializedInput
): void {
  const event = mockBondingCurveInitialized(sample)
  handleBondingCurveInitializedTx(event)
}

export function callhandleSubjectSharePurchasedTx(
  sample: MoxieBondingCurveSubjectSharePurchasedInput
): void {
  const event = mockSubjectSharePurchased(sample)
  handleSubjectSharePurchasedTx(event)
}
export function callhandleSubjectShareSoldTx(
  sample: MoxieBondingCurveSubjectShareSoldInput
): void {
  const event = mockSubjectShareSold(sample)
  handleSubjectShareSoldTx(event)
}

describe("MoxieBondingCurve", () => {
  beforeEach(() => {
    clearStore()
  })
  test("test handleSubjectSharePurchasedTx", () => {
    const sample: MoxieBondingCurveSubjectSharePurchasedInput =
      new MoxieBondingCurveSubjectSharePurchasedInput(
        "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
        "10",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "10",
        "0xfcf78ac094288d7200cfdb367a8cd07108dfa128"
      )
    callhandleSubjectSharePurchasedTx(sample)
    // asserts
    let createdEntity = MoxieBondingCurveSubjectSharePurchasedTx.load(
      sample.hash
    )!
    assert.stringEquals(
      createdEntity.beneficiary.toHexString(),
      sample.beneficiary
    )
    assert.stringEquals(createdEntity.subject.toHexString(), sample.subject)
    assert.stringEquals(createdEntity.sellToken.toHexString(), sample.sellToken)
    assert.stringEquals(createdEntity.sellAmount.toString(), sample.sellAmount)
    assert.stringEquals(createdEntity.buyToken.toHexString(), sample.buyToken)
    assert.stringEquals(createdEntity.buyAmount.toString(), sample.buyAmount)
    assert.stringEquals(
      createdEntity.beneficiary.toHexString(),
      sample.beneficiary
    )
  })
  test("test handleSubjectShareSoldTx", () => {
    const sample: MoxieBondingCurveSubjectShareSoldInput =
      new MoxieBondingCurveSubjectShareSoldInput(
        "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
        "10",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "10",
        "0xfcf78ac094288d7200cfdb367a8cd07108dfa128"
      )
    callhandleSubjectShareSoldTx(sample)
    // asserts
    let createdEntity = MoxieBondingCurveSubjectShareSoldTx.load(sample.hash)!
    assert.stringEquals(
      createdEntity.beneficiary.toHexString(),
      sample.beneficiary
    )
    assert.stringEquals(createdEntity.subject.toHexString(), sample.subject)
    assert.stringEquals(createdEntity.sellToken.toHexString(), sample.sellToken)
    assert.stringEquals(createdEntity.sellAmount.toString(), sample.sellAmount)
    assert.stringEquals(createdEntity.buyToken.toHexString(), sample.buyToken)
    assert.stringEquals(createdEntity.buyAmount.toString(), sample.buyAmount)
    assert.stringEquals(
      createdEntity.beneficiary.toHexString(),
      sample.beneficiary
    )
  })
  test("test handleBondingCurveInitializedTx", () => {
    const sample: MoxieBondingCurveBondingCurveInitializedInput =
      new MoxieBondingCurveBondingCurveInitializedInput(
        "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "10",
        "10",
        "10"
      )
    callhandleBondingCurveInitializedTx(sample)
    // asserts
    let createdEntity = MoxieBondingCurveBondingCurveInitializedTx.load(
      sample.hash
    )!
    assert.stringEquals(createdEntity.subject.toHexString(), sample.subject)
    assert.stringEquals(
      createdEntity.subjectToken.toHexString(),
      sample.subjectToken
    )
    assert.stringEquals(
      createdEntity.initialSupply.toString(),
      sample.initialSupply
    )
    assert.stringEquals(createdEntity.reserve.toString(), sample.reserve)
    assert.stringEquals(
      createdEntity.reserveRatio.toString(),
      sample.reserveRatio
    )
  })
})
