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

export function mockVaultTransfer(input: VaultTransferInput): VaultTransfer {
  let vaultTransfer = changetype<VaultTransfer>(newMockEvent())
  let subject = getAddressEventParam("subject", input.subject)
  let token = getAddressEventParam("token", input.token)
  let to = getAddressEventParam("to", input.to)
  let amount = getBigIntEventParam("amount", input.amount)
  let totalReserve = getBigIntEventParam("totalReserve", input.totalReserve)
  vaultTransfer.parameters = [subject, token, to, amount, totalReserve]
  return vaultTransfer
}

export function mockVaultDeposit(input: VaultDepositInput): VaultDeposit {
  let vaultDeposit = changetype<VaultDeposit>(newMockEvent())
  let subject = getAddressEventParam("subject", input.subject)
  let token = getAddressEventParam("token", input.token)
  let sender = getAddressEventParam("sender", input.sender)
  let amount = getBigIntEventParam("amount", input.amount)
  let totalReserve = getBigIntEventParam("totalReserve", input.totalReserve)
  vaultDeposit.parameters = [subject, token, sender, amount, totalReserve]
  vaultDeposit.transaction.hash = Bytes.fromHexString(input.hash)
  vaultDeposit.address = Address.fromString(input.contractAddress)
  return vaultDeposit
}
