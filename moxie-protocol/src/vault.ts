import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { getOrCreateSubject, loadSummary, saveSubject } from "./utils"
import { handleVaultDepositTx, handleVaultTransferTx } from "./vault-tx"

export function handleVaultDeposit(event: VaultDeposit): void {
  // event VaultDeposit(
  //      address indexed subject, : _subjectToken
  //      address indexed token, : _token
  //      address indexed sender, : msg.sender
  //      uint256 amount, : _value
  //      uint256 totalReserve : reserves[_subjectToken][_token]
  //  );
  handleVaultDepositTx(event)
  let subjectToken = event.params.subject
  let subject = getOrCreateSubject(subjectToken)
  // subject.reserve = subject.reserve.plus(event.params.amount)
  subject.reserve = event.params.totalReserve
  saveSubject(subject, event.block.timestamp)

  let summary = loadSummary()
  summary.totalReserve = summary.totalReserve.plus(event.params.amount)
  summary.save()
}

export function handleVaultTransfer(event: VaultTransfer): void {
  //  event VaultTransfer(
  //     address indexed subject,:_subjectToken
  //     address indexed token,: _token
  //     address indexed to, :_to
  //     uint256 amount, :_value
  //     uint256 totalReserve :reserves[_subjectToken][_token])
  // );
  // Transfers tokens(MOXIE) of amount _value to _to
  handleVaultTransferTx(event)
  let subjectToken = event.params.subject
  let subject = getOrCreateSubject(subjectToken)
  // subject.reserve = subject.reserve.minus(event.params.amount)
  subject.reserve = event.params.totalReserve
  saveSubject(subject, event.block.timestamp)

  let summary = loadSummary()
  summary.totalReserve = summary.totalReserve.minus(event.params.amount)
  summary.save()
}
