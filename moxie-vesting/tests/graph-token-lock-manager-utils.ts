import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  FunctionCallAuth,
  MasterCopyUpdated,
  OwnershipTransferred,
  ProxyCreated,
  TokenDestinationAllowed,
  TokenLockCreated,
  TokensDeposited,
  TokensWithdrawn
} from "../generated/GraphTokenLockManager/GraphTokenLockManager"

export function createFunctionCallAuthEvent(
  caller: Address,
  sigHash: Bytes,
  target: Address,
  signature: string
): FunctionCallAuth {
  let functionCallAuthEvent = changetype<FunctionCallAuth>(newMockEvent())

  functionCallAuthEvent.parameters = new Array()

  functionCallAuthEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  functionCallAuthEvent.parameters.push(
    new ethereum.EventParam("sigHash", ethereum.Value.fromFixedBytes(sigHash))
  )
  functionCallAuthEvent.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  )
  functionCallAuthEvent.parameters.push(
    new ethereum.EventParam("signature", ethereum.Value.fromString(signature))
  )

  return functionCallAuthEvent
}

export function createMasterCopyUpdatedEvent(
  masterCopy: Address
): MasterCopyUpdated {
  let masterCopyUpdatedEvent = changetype<MasterCopyUpdated>(newMockEvent())

  masterCopyUpdatedEvent.parameters = new Array()

  masterCopyUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "masterCopy",
      ethereum.Value.fromAddress(masterCopy)
    )
  )

  return masterCopyUpdatedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createProxyCreatedEvent(proxy: Address): ProxyCreated {
  let proxyCreatedEvent = changetype<ProxyCreated>(newMockEvent())

  proxyCreatedEvent.parameters = new Array()

  proxyCreatedEvent.parameters.push(
    new ethereum.EventParam("proxy", ethereum.Value.fromAddress(proxy))
  )

  return proxyCreatedEvent
}

export function createTokenDestinationAllowedEvent(
  dst: Address,
  allowed: boolean
): TokenDestinationAllowed {
  let tokenDestinationAllowedEvent = changetype<TokenDestinationAllowed>(
    newMockEvent()
  )

  tokenDestinationAllowedEvent.parameters = new Array()

  tokenDestinationAllowedEvent.parameters.push(
    new ethereum.EventParam("dst", ethereum.Value.fromAddress(dst))
  )
  tokenDestinationAllowedEvent.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  )

  return tokenDestinationAllowedEvent
}

export function createTokenLockCreatedEvent(
  contractAddress: Address,
  initHash: Bytes,
  beneficiary: Address,
  token: Address,
  managedAmount: BigInt,
  startTime: BigInt,
  endTime: BigInt,
  periods: BigInt,
  releaseStartTime: BigInt,
  vestingCliffTime: BigInt,
  revocable: i32
): TokenLockCreated {
  let tokenLockCreatedEvent = changetype<TokenLockCreated>(newMockEvent())

  tokenLockCreatedEvent.parameters = new Array()

  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "contractAddress",
      ethereum.Value.fromAddress(contractAddress)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam("initHash", ethereum.Value.fromFixedBytes(initHash))
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "managedAmount",
      ethereum.Value.fromUnsignedBigInt(managedAmount)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startTime",
      ethereum.Value.fromUnsignedBigInt(startTime)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "endTime",
      ethereum.Value.fromUnsignedBigInt(endTime)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "periods",
      ethereum.Value.fromUnsignedBigInt(periods)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "releaseStartTime",
      ethereum.Value.fromUnsignedBigInt(releaseStartTime)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "vestingCliffTime",
      ethereum.Value.fromUnsignedBigInt(vestingCliffTime)
    )
  )
  tokenLockCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "revocable",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(revocable))
    )
  )

  return tokenLockCreatedEvent
}

export function createTokensDepositedEvent(
  sender: Address,
  amount: BigInt
): TokensDeposited {
  let tokensDepositedEvent = changetype<TokensDeposited>(newMockEvent())

  tokensDepositedEvent.parameters = new Array()

  tokensDepositedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  tokensDepositedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return tokensDepositedEvent
}

export function createTokensWithdrawnEvent(
  sender: Address,
  amount: BigInt
): TokensWithdrawn {
  let tokensWithdrawnEvent = changetype<TokensWithdrawn>(newMockEvent())

  tokensWithdrawnEvent.parameters = new Array()

  tokensWithdrawnEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  tokensWithdrawnEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return tokensWithdrawnEvent
}
