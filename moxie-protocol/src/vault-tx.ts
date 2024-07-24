import { VaultDepositTx, VaultTransferTx } from "../generated/schema"
import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { getOrCreateBlockInfo, getTxEntityId } from "./utils"

export function handleVaultDepositTx(event: VaultDeposit): void {
  let vaultDepositTx = new VaultDepositTx(getTxEntityId(event))
  vaultDepositTx.amount = event.params.amount
  vaultDepositTx.sender = event.params.sender
  vaultDepositTx.subject = event.params.subject
  vaultDepositTx.token = event.params.token
  vaultDepositTx.totalReserve = event.params.totalReserve
  vaultDepositTx.txHash = event.transaction.hash
  vaultDepositTx.blockInfo = getOrCreateBlockInfo(event.block).id
  vaultDepositTx.save()
}

export function handleVaultTransferTx(event: VaultTransfer): void {
  let vaultTransferTx = new VaultTransferTx(getTxEntityId(event))
  vaultTransferTx.amount = event.params.amount
  vaultTransferTx.to = event.params.to
  vaultTransferTx.subject = event.params.subject
  vaultTransferTx.token = event.params.token
  vaultTransferTx.totalReserve = event.params.totalReserve
  vaultTransferTx.txHash = event.transaction.hash
  vaultTransferTx.blockInfo = getOrCreateBlockInfo(event.block).id
  vaultTransferTx.save()
}
