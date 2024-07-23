import { VaultDeposit, VaultTransfer } from "../generated/Vault/Vault"
import { getOrCreateSubjectToken, saveSubjectToken } from "./utils"

export function handleVaultDeposit(event: VaultDeposit): void {
  // event VaultDeposit(
  //      address indexed subject, : _subjectToken
  //      address indexed token, : _token
  //      address indexed sender, : msg.sender
  //      uint256 amount, : _value
  //      uint256 totalReserve : reserves[_subjectToken][_token]
  //  );
  let subjectToken = getOrCreateSubjectToken(event.params.subject, event.block)
  subjectToken.reserve = event.params.totalReserve
  saveSubjectToken(subjectToken, event.block)
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
  let subjectToken = getOrCreateSubjectToken(event.params.subject, event.block)
  subjectToken.reserve = event.params.totalReserve
  saveSubjectToken(subjectToken, event.block)
}
