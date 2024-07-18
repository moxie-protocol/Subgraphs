import {
  describe,
  test,
  clearStore,
  beforeEach,
  assert,
} from "matchstick-as/assembly/index"
import {
  TokenLockManager,
  TokenLockWallet,
  AuthorizedFunction,
} from "../generated/schema"
import {
  mockFunctionCallAuth,
  mockMasterCopyUpdated,
  mockMoxiePassTokenUpdated,
  mockTokenLockCreated,
  mockTokensDeposited,
  mockTokensWithdrawn,
} from "./mocks"
import {
  FunctionCallAuthInput,
  MasterCopyUpdatedInput,
  MoxiePassTokenUpdatedInput,
  TokenLockCreatedInput,
  TokensDepositedInput,
  TokensWithdrawnInput,
} from "./types"
import {
  handleFunctionCallAuth,
  handleMasterCopyUpdated,
  handleMoxiePassTokenUpdated,
  handleTokenLockCreated,
  handleTokensDeposited,
  handleTokensWithdrawn,
} from "../src/mappings/manager"
import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"

const DUMMY_ADDRESS = "0xbe5e630383b5baecf0db7b15c50d410edd5a2255"
const MASTER_COPY = "0xbe5e630383b5baecf0db7b15c50d410edd5a2255"
const TOKENS = BigInt.fromI32(100000)
export function createDummyTokenManager(): TokenLockManager {
  let manager = new TokenLockManager(DUMMY_ADDRESS)
  manager.tokens = TOKENS
  manager.tokenLockCount = BigInt.fromI32(0)
  manager.masterCopy = Bytes.fromHexString(MASTER_COPY)
  manager.save()
  return manager
}
describe("Manager", () => {
  beforeEach(() => {
    clearStore()
  })
  test("test handleMasterCopyUpdated", () => {
    const sample1: MasterCopyUpdatedInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      masterCopy: "0xbe5e630383b5baecf0db7b15c50d410edd5a2255",
      contractAddress: "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
    }
    const event = mockMasterCopyUpdated(sample1)
    // calling the handler
    handleMasterCopyUpdated(event)
    // asserts
    let createdEntity = TokenLockManager.load(sample1.contractAddress)!
    assert.stringEquals(
      createdEntity.masterCopy.toHexString(),
      sample1.masterCopy
    )
  })

  test("test handleMoxiePassTokenUpdated", () => {
    createDummyTokenManager()
    const sample: MoxiePassTokenUpdatedInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      contractAddress: DUMMY_ADDRESS,
      moxiePassToken: "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
    }
    const event = mockMoxiePassTokenUpdated(sample)
    handleMoxiePassTokenUpdated(event)
    let createdEntity = TokenLockManager.load(DUMMY_ADDRESS)!
    assert.stringEquals(
      createdEntity!.moxiePassToken!.toHexString(),
      sample.moxiePassToken
    )
  })

  test("test handleTokensWithdrawn", () => {
    createDummyTokenManager()
    let withdrawnAmount = BigInt.fromI32(1000)
    const sample: TokensWithdrawnInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      contractAddress: DUMMY_ADDRESS,
      sender: DUMMY_ADDRESS,
      amount: withdrawnAmount.toString(),
    }
    const event = mockTokensWithdrawn(sample)
    handleTokensWithdrawn(event)
    let createdEntity = TokenLockManager.load(DUMMY_ADDRESS)!
    assert.stringEquals(
      createdEntity!.tokens.toString(),
      TOKENS.minus(withdrawnAmount).toString()
    )
  })
  test("test handleTokensDeposited", () => {
    createDummyTokenManager()
    let withdrawnAmount = BigInt.fromI32(1000)
    const sample: TokensDepositedInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      contractAddress: DUMMY_ADDRESS,
      sender: DUMMY_ADDRESS,
      amount: withdrawnAmount.toString(),
    }
    const event = mockTokensDeposited(sample)
    handleTokensDeposited(event)
    let createdEntity = TokenLockManager.load(DUMMY_ADDRESS)!
    assert.stringEquals(
      createdEntity!.tokens.toString(),
      TOKENS.plus(withdrawnAmount).toString()
    )
  })
  test("test handleFunctionCallAuth", () => {
    createDummyTokenManager()
    const sample: FunctionCallAuthInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      contractAddress: DUMMY_ADDRESS,
      caller: DUMMY_ADDRESS,
      signature: "delegate(address,uint256)",
      sigHash: "0x026e402b",
      target: "0xf55041e37e12cd407ad00ce2910b8269b01263b9",
    }
    const event = mockFunctionCallAuth(sample)
    handleFunctionCallAuth(event)
    let createdEntity = AuthorizedFunction.load(
      sample.signature + "-" + DUMMY_ADDRESS
    )!
    assert.stringEquals(createdEntity!.sig.toString(), sample.signature)
    assert.stringEquals(createdEntity!.target.toHexString(), sample.target)
    assert.stringEquals(createdEntity!.sigHash.toHexString(), sample.sigHash)
    const sample1: FunctionCallAuthInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      contractAddress: DUMMY_ADDRESS,
      caller: DUMMY_ADDRESS,
      signature: "delegate(address,uint256)",
      sigHash: "0x026e402b",
      target: Address.zero().toHexString(),
    }
    const event1 = mockFunctionCallAuth(sample1)
    handleFunctionCallAuth(event1)
    assert.entityCount("AuthorizedFunction", 0)
  })
  test("test handleTokenLockCreated", () => {
    createDummyTokenManager()
    let createdEntity = TokenLockManager.load(DUMMY_ADDRESS)!
    assert.stringEquals(createdEntity!.tokenLockCount.toString(), "0")
    const sample: TokenLockCreatedInput = {
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      initHash:
        "0x4dd2c6b01a94ab409fb278e00c4faa764963518f81f96250fedfed769c6239b9",
      beneficiary: "0x65944D0aCEfEBdf98FE8Ca5B350E3De01982f512",
      contractAddress: DUMMY_ADDRESS,
      token: "0xc944E90C64B2c07662A292be6244BDf05Cda44a7",
      managedAmount: "10000000000000000000000000",
      startTime: "1595610000",
      endTime: "1627146000",
      periods: "1",
      releaseStartTime: "0",
      vestingCliffTime: "0",
      revocable: "2",
    }
    const event = mockTokenLockCreated(sample)
    handleTokenLockCreated(event)
    let updatedEntity = TokenLockManager.load(DUMMY_ADDRESS)!
    assert.stringEquals(updatedEntity!.tokenLockCount.toString(), "1")
  })
})
