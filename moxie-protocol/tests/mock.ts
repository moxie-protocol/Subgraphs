import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"

import { newMockEvent } from "matchstick-as"
import { VaultDepositInput, VaultTransferInput } from "./types"
import {
  addressValue,
  getAddressEventParam,
  getBigIntEventParam,
  getBooleanEventParam,
  getBytesEventParam,
  getStringEventParam,
} from "./utils"
import { Address, Bytes } from "@graphprotocol/graph-ts"

export function mockMasterCopyUpdated(
  input: MasterCopyUpdatedInput
): MasterCopyUpdated {
  //   preparing event params
  let masterCopyUpdated = changetype<MasterCopyUpdated>(newMockEvent())
  let masterCopy = getAddressEventParam("masterCopy", input.masterCopy)
  masterCopyUpdated.parameters = [masterCopy]
  masterCopyUpdated.transaction.hash = Bytes.fromHexString(input.hash)
  masterCopyUpdated.address = Address.fromString(input.contractAddress)
  return masterCopyUpdated
}

export function mockTokenLockCreated(
  input: TokenLockCreatedInput
): TokenLockCreated {
  let tokenLockCreated = changetype<TokenLockCreated>(newMockEvent())
  let contractAddress = getAddressEventParam(
    "TokenLockCreated",
    input.contractAddress
  )
  let initHash = getBytesEventParam("initHash", input.initHash)
  let beneficiary = getAddressEventParam("beneficiary", input.beneficiary)
  let token = getAddressEventParam("token", input.token)
  let managedAmount = getBigIntEventParam("managedAmount", input.managedAmount)
  let startTime = getBigIntEventParam("startTime", input.startTime)
  let endTime = getBigIntEventParam("endTime", input.endTime)
  let periods = getBigIntEventParam("periods", input.periods)
  let releaseStartTime = getBigIntEventParam(
    "releaseStartTime",
    input.releaseStartTime
  )
  let vestingCliffTime = getBigIntEventParam(
    "vestingCliffTime",
    input.vestingCliffTime
  )
  let revocable = getBigIntEventParam("revocable", input.revocable)
  tokenLockCreated.parameters = [
    contractAddress,
    initHash,
    beneficiary,
    token,
    managedAmount,
    startTime,
    endTime,
    periods,
    releaseStartTime,
    vestingCliffTime,
    revocable,
  ]
  tokenLockCreated.transaction.hash = Bytes.fromHexString(input.hash)
  tokenLockCreated.address = Address.fromString(input.contractAddress)
  return tokenLockCreated
}

export function mockTokensDeposited(
  input: TokensDepositedInput
): TokensDeposited {
  let tokensDeposited = changetype<TokensDeposited>(newMockEvent())
  let sender = getAddressEventParam("sender", input.sender)
  let amount = getBigIntEventParam("amount", input.amount)
  tokensDeposited.parameters = [sender, amount]
  tokensDeposited.transaction.hash = Bytes.fromHexString(input.hash)
  tokensDeposited.address = Address.fromString(input.contractAddress)
  return tokensDeposited
}

export function mockTokensWithdrawn(
  input: TokensWithdrawnInput
): TokensWithdrawn {
  let tokensWithdrawn = changetype<TokensWithdrawn>(newMockEvent())
  let senderParam = getAddressEventParam("sender", input.sender)
  let amountParam = getBigIntEventParam("amount", input.amount)
  tokensWithdrawn.parameters = [senderParam, amountParam]
  tokensWithdrawn.address = Address.fromString(input.contractAddress)
  return tokensWithdrawn
}

export function mockFunctionCallAuth(
  input: FunctionCallAuthInput
): FunctionCallAuth {
  let functionCallAuth = changetype<FunctionCallAuth>(newMockEvent())
  let caller = getAddressEventParam("caller", input.caller)
  let sigHash = getBytesEventParam("sigHash", input.sigHash)
  let target = getAddressEventParam("target", input.target)
  let signature = getStringEventParam("signature", input.signature)
  functionCallAuth.parameters = [caller, sigHash, target, signature]
  functionCallAuth.transaction.hash = Bytes.fromHexString(input.hash)
  functionCallAuth.address = Address.fromString(input.contractAddress)
  return functionCallAuth
}

export function mockTokenDestinationAllowed(
  input: TokenDestinationAllowedInput
): TokenDestinationAllowed {
  let tokenDestinationAllowed = changetype<TokenDestinationAllowed>(
    newMockEvent()
  )
  let dstParam = getAddressEventParam("dst", input.dst)
  let allowedParam = getBooleanEventParam("allowed", input.allowed)
  tokenDestinationAllowed.parameters = [dstParam, allowedParam]
  tokenDestinationAllowed.transaction.hash = Bytes.fromHexString(input.hash)
  tokenDestinationAllowed.address = Address.fromString(input.contractAddress)
  return tokenDestinationAllowed
}

export function mockMoxiePassTokenUpdated(
  input: MoxiePassTokenUpdatedInput
): MoxiePassTokenUpdated {
  let moxiePassTokenUpdated = changetype<MoxiePassTokenUpdated>(newMockEvent())
  let moxiePassTokenParam = getAddressEventParam(
    "moxiePassToken",
    input.moxiePassToken
  )
  moxiePassTokenUpdated.parameters = [moxiePassTokenParam]
  moxiePassTokenUpdated.transaction.hash = Bytes.fromHexString(input.hash)
  moxiePassTokenUpdated.address = Address.fromString(input.contractAddress)
  return moxiePassTokenUpdated
}

/** Token lock mocks */

export function mockTokenLockTokensReleased(
  input: TokenLockTokensReleasedInput
): TokenLockTokensReleased {
  let tokensReleased = changetype<TokenLockTokensReleased>(newMockEvent())
  let beneficiary = getAddressEventParam("beneficiary", input.beneficiary)
  let amount = getBigIntEventParam("amount", input.amount)
  tokensReleased.parameters = [beneficiary, amount]
  tokensReleased.transaction.hash = Bytes.fromHexString(input.hash)
  tokensReleased.address = Address.fromString(input.contractAddress)
  return tokensReleased
}

export function mockTokenLockTokensWithdrawn(
  input: TokenLockTokensWithdrawnInput
): TokenLockTokensWithdrawn {
  let tokensWithdrawn = changetype<TokenLockTokensWithdrawn>(newMockEvent())
  let beneficiaryParam = getAddressEventParam("beneficiary", input.beneficiary)
  let amountParam = getBigIntEventParam("amount", input.amount)
  tokensWithdrawn.parameters = [beneficiaryParam, amountParam]
  tokensWithdrawn.transaction.hash = Bytes.fromHexString(input.hash)
  tokensWithdrawn.address = Address.fromString(input.contractAddress)
  return tokensWithdrawn
}

export function mockTokenLockTokensRevoked(
  input: TokenLockTokensRevokedInput
): TokenLockTokensRevoked {
  let tokensRevoked = changetype<TokenLockTokensRevoked>(newMockEvent())
  let beneficiaryParam = getAddressEventParam("beneficiary", input.beneficiary)
  let amountParam = getBigIntEventParam("amount", input.amount)
  tokensRevoked.parameters = [beneficiaryParam, amountParam]
  tokensRevoked.transaction.hash = Bytes.fromHexString(input.hash)
  tokensRevoked.address = Address.fromString(input.contractAddress)
  return tokensRevoked
}

export function mockTokenLockBeneficiaryChanged(
  input: TokenLockBeneficiaryChangedInput
): TokenLockBeneficiaryChanged {
  let beneficiaryChanged = changetype<TokenLockBeneficiaryChanged>(
    newMockEvent()
  )
  let newBeneficiary = getAddressEventParam(
    "newBeneficiary",
    input.newBeneficiary
  )
  beneficiaryChanged.parameters = [newBeneficiary]
  beneficiaryChanged.transaction.hash = Bytes.fromHexString(input.hash)
  beneficiaryChanged.address = Address.fromString(input.contractAddress)
  return beneficiaryChanged
}

export function mockTokenLockLockAccepted(
  input: TokenLockLockAcceptedInput
): TokenLockLockAccepted {
  let lockAccepted = changeType<TokenLockLockAccepted>(newMockEvent())
  lockAccepted.transaction.hash = input.hash
  lockAccepted.address = Address.fromString(input.contractAddress)
  return lockAccepted
}

export function mockTokenLockLockCanceled(
  input: TokenLockLockCanceledInput
): TokenLockLockCanceled {
  let lockCancelled = changeType<TokenLockLockCanceled>(newMockEvent())
  lockCancelled.transaction.hash = input.hash
  lockCancelled.address = Address.fromString(input.contractAddress)
  return lockCancelled
}

export function mockTokenLockManagerUpdated(
  input: TokenLockManagerUpdatedInput
): TokenLockManagerUpdated {
  let managerUpdated = changeType<TokenLockManagerUpdated>(newMockEvent())
  let oldManagerParam = getAddressEventParam("oldManager", input.oldManager)
  let newManagerParam = getAddressEventParam("newManager", input.newManager)
  managerUpdated.params = [oldManagerParam, newManagerParam]
  managerUpdated.transaction.hash = input.hash
  managerUpdated.address = Address.fromString(input.contractAddress)
  return managerUpdated
}

export function mockTokenLockTokenDestinationsApproved(
  input: TokenLockTokenDestinationsApprovedInput
): TokenDestinationsApprovedEvent {
  let destinationsApprovedInput = changeType<TokenDestinationsApprovedEvent>(
    newMockEvent()
  )
  destinationsApprovedInput.transaction.hash = input.hash
  destinationsApprovedInput.address = Address.fromString(input.contractAddress)
  return destinationsApprovedInput
}

export function mockTokenLockTokenDestinationsRevoked(
  input: TokenLockTokenDestinationsRevokedInput
): TokenDestinationsRevokedEvent {
  let event = changeType<TokenDestinationsRevokedEvent>(newMockEvent())
  event.transaction.hash = input.hash
  event.address = Address.fromString(input.contractAddress)
  return event
}
