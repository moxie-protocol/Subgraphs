import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { getOrCreateSubject, saveSubject } from "./utils"

export function handleVaultDeposit(event: VaultDeposit): void {
  // event VaultDeposit(
  //      address indexed subject, : _subjectToken
  //      address indexed token, : _token
  //      address indexed sender, : msg.sender
  //      uint256 amount, : _value
  //      uint256 totalReserve : reserves[_subjectToken][_token]
  //  );
  let subjectToken = event.params.subject
  let subject = getOrCreateSubject(subjectToken)
  // subject.reserve = subject.reserve.plus(event.params.amount)
  subject.reserve = event.params.totalReserve
  saveSubject(subject, event.block.timestamp)
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
  let subjectToken = event.params.subject
  let subject = getOrCreateSubject(subjectToken)
  // subject.reserve = subject.reserve.minus(event.params.amount)
  subject.reserve = event.params.totalReserve
  saveSubject(subject, event.block.timestamp)
}
