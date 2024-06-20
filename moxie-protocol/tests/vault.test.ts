import { assert, beforeEach, clearStore, describe, test } from "matchstick-as"
import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { TokenManagerTokenDeployedTx } from "../generated/schema"
import { TokenManagerTokenDeployedInput } from "./utils/types"
import { handleTokenDeployedTx } from "../src/token-manager-tx"
import { mockTokenDeployed } from "./utils/token-manager-mock"

export function callHandleTokenDeployedTx(
  sample: TokenManagerTokenDeployedInput
): void {
  const event = mockTokenDeployed(sample)
  handleTokenDeployedTx(event)
}

describe("TokenManager", () => {
  beforeEach(() => {
    clearStore()
  })
  test("test handleTokenDeployedTx", () => {
    const sample: TokenManagerTokenDeployedInput =
      new TokenManagerTokenDeployedInput(
        "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
        "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
        "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
        "10"
      )
    callHandleTokenDeployedTx(sample)
    // asserts
    let createdEntity = TokenManagerTokenDeployedTx.load(sample.hash)!
    assert.stringEquals(
      createdEntity.beneficiary.toHexString(),
      sample.beneficiary
    )
    assert.stringEquals(createdEntity.token.toHexString(), sample.token)
    assert.stringEquals(
      createdEntity.initialSupply.toString(),
      sample.initialSupply
    )
  })
})
