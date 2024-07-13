import {
  describe,
  test,
  clearStore,
  beforeEach,
  assert,
} from "matchstick-as/assembly/index"
import { TokenLockWallet, TokenLockManager } from "../generated/schema"
import {} from "./manager.test"
import {
  mockTokenLockManagerUpdated,
  mockTokenLockTokenDestinationsApproved,
  mockTokenLockTokenDestinationsRevoked,
  mockTokenLockTokensReleased,
  mockTokenLockTokensRevoked,
  mockTokenLockTokensWithdrawn,
} from "./mocks"
import {
  TokenLockManagerUpdatedInput,
  TokenLockTokenDestinationsApprovedInput,
  TokenLockTokenDestinationsRevokedInput,
  TokenLockTokensReleasedInput,
  TokenLockTokensRevokedInput,
  TokenLockTokensWithdrawnInput,
} from "./types"
import {
  handleManagerUpdated,
  handleTokenDestinationsApproved,
  handleTokenDestinationsRevoked,
  handleTokensReleased,
  handleTokensRevoked,
  handleTokensWithdrawn,
} from "../src/mappings/tokenLockWallet"
import { Bytes, BigInt, log } from "@graphprotocol/graph-ts"

const MASTER_COPY = "0xbe5e630383b5baecf0db7b15c50d410edd5a2255"
const DUMMY_ADDRESS = "0xbe5e630383b5baecf0db7b15c50d410edd5a2255"
const TOKENS = BigInt.fromI32(100000)

function createDummytokenLockWallet(): TokenLockWallet {
  let manager = new TokenLockManager(DUMMY_ADDRESS)
  manager.tokens = TOKENS
  manager.tokenLockCount = BigInt.fromI32(0)
  manager.masterCopy = Bytes.fromHexString(MASTER_COPY)
  manager.save()
  let tokenLockWallet = new TokenLockWallet(
    "0xfcf78ac094288d7200cfdb367a8cd07108dfa128"
  )
  tokenLockWallet.manager = manager.id
  tokenLockWallet.initHash = Bytes.fromHexString(
    "0x4dd2c6b01a94ab409fb278e00c4faa764963518f81f96250fedfed769c6239b9"
  )
  tokenLockWallet.beneficiary = Bytes.fromHexString(
    "0x65944D0aCEfEBdf98FE8Ca5B350E3De01982f512"
  )
  tokenLockWallet.managedAmount = BigInt.fromI32(1000)
  tokenLockWallet.balance = BigInt.fromI32(1000)
  tokenLockWallet.startTime = BigInt.fromI32(1595610000)
  tokenLockWallet.endTime = BigInt.fromI32(1627146000)
  tokenLockWallet.periods = BigInt.fromI32(1)
  tokenLockWallet.releaseStartTime = BigInt.fromI32(0)
  tokenLockWallet.vestingCliffTime = BigInt.fromI32(0)
  tokenLockWallet.tokenDestinationsApproved = false
  tokenLockWallet.tokensReleased = BigInt.fromI32(0)
  tokenLockWallet.tokensWithdrawn = BigInt.fromI32(0)
  tokenLockWallet.tokensRevoked = BigInt.fromI32(0)
  tokenLockWallet.blockNumberCreated = BigInt.fromI32(20037257)
  tokenLockWallet.txHash = Bytes.fromHexString(
    "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7"
  )
  tokenLockWallet.lockAccepted = false
  tokenLockWallet.save()
  return tokenLockWallet
}
describe("tokenLockWallet", () => {
  beforeEach(() => {
    clearStore()
    createDummytokenLockWallet()
  })
  test("test handleTokensReleased", () => {
    const sample: TokenLockTokensReleasedInput = {
      contractAddress: "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      beneficiary: "0x65944D0aCEfEBdf98FE8Ca5B350E3De01982f512",
      amount: "100",
    }
    const event = mockTokenLockTokensReleased(sample)
    handleTokensReleased(event)
    let createdEntity = TokenLockWallet.load(sample.contractAddress)!
    assert.stringEquals(createdEntity.tokensReleased.toString(), "100")
    assert.stringEquals(createdEntity.balance.toString(), "900")
  })
  test("test handleTokensWithdrawn", () => {
    const sample: TokenLockTokensWithdrawnInput = {
      contractAddress: "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      beneficiary: "0x65944D0aCEfEBdf98FE8Ca5B350E3De01982f512",
      amount: "100",
    }
    const event = mockTokenLockTokensWithdrawn(sample)
    handleTokensWithdrawn(event)
    let createdEntity = TokenLockWallet.load(sample.contractAddress)!
    assert.stringEquals(createdEntity.tokensWithdrawn.toString(), "100")
    assert.stringEquals(createdEntity.balance.toString(), "900")
    assert.entityCount("TokenLockWallet", 1)
  })
  test("test handleTokensRevoked", () => {
    const sample: TokenLockTokensRevokedInput = {
      contractAddress: "0xfcf78ac094288d7200cfdb367a8cd07108dfa128",
      hash: "0x000266c0a8904b3047dfab75698ff61be54a055aea90b19b531ca1d3d50ec0f7",
      beneficiary: "0x65944D0aCEfEBdf98FE8Ca5B350E3De01982f512",
      amount: "100",
    }
    const event = mockTokenLockTokensRevoked(sample)
    handleTokensRevoked(event)
    let createdEntity = TokenLockWallet.load(sample.contractAddress)!
    assert.stringEquals(createdEntity.tokensRevoked.toString(), "100")
    assert.stringEquals(createdEntity.balance.toString(), "900")
    assert.entityCount("TokenLockWallet", 1)
  })
})
