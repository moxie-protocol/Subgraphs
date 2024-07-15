import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { VaultDepositTx, VaultTransferTx } from "../generated/schema"
import { getOrCreateBlockInfo, getOrCreateSubject, getTxEntityId, loadSummary, saveSubject } from "./utils"

export function handleVaultDepositTx(event: VaultDeposit): void {
  let vaultDeposit = new VaultDepositTx(getTxEntityId(event))
  vaultDeposit.blockInfo = getOrCreateBlockInfo(event.block).id
  vaultDeposit.txHash = event.transaction.hash
  vaultDeposit.subject = event.params.subject
  vaultDeposit.token = event.params.token
  vaultDeposit.sender = event.params.sender
  vaultDeposit.amount = event.params.amount
  vaultDeposit.totalReserve = event.params.totalReserve
  vaultDeposit.save()
}

export function handleVaultTransferTx(event: VaultTransfer): void {
  let vaultTransfer = new VaultTransferTx(getTxEntityId(event))
  vaultTransfer.blockInfo = getOrCreateBlockInfo(event.block).id
  vaultTransfer.txHash = event.transaction.hash

  vaultTransfer.subject = event.params.subject
  vaultTransfer.token = event.params.token
  vaultTransfer.to = event.params.to
  vaultTransfer.amount = event.params.amount
  vaultTransfer.totalReserve = event.params.totalReserve
  vaultTransfer.save()
}
