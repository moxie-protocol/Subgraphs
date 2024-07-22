import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { getOrCreateSubjectToken, getOrCreateSummary, saveSubjectTokenAndSnapshots } from "./utils"

export function handleVaultDeposit(event: VaultDeposit): void {
  // event VaultDeposit(
  //      address indexed subject, : _subjectToken
  //      address indexed token, : _token
  //      address indexed sender, : msg.sender
  //      uint256 amount, : _value
  //      uint256 totalReserve : reserves[_subjectToken][_token]
  //  );
  let subjectToken = getOrCreateSubjectToken(event.params.subject, null, event.block)
  // subject.reserve = subject.reserve.plus(event.params.amount)
  subjectToken.reserve = event.params.totalReserve
  saveSubjectTokenAndSnapshots(subjectToken, event.block)

  let summary = getOrCreateSummary()
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
  let subjectToken = getOrCreateSubjectToken(event.params.subject, null, event.block)

  // subjectToken.reserve = subjectToken.reserve.minus(event.params.amount)
  subjectToken.reserve = event.params.totalReserve
  saveSubjectTokenAndSnapshots(subjectToken, event.block)

  let summary = getOrCreateSummary()
  summary.totalReserve = summary.totalReserve.minus(event.params.amount)
  summary.save()
}
