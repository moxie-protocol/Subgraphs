import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  TokensReleased,
  TokensWithdrawn,
  TokensRevoked,
  ManagerUpdated,
  // ApproveTokenDestinations,
  // RevokeTokenDestinations,
  TokenDestinationsApproved,
  TokenDestinationsRevoked,
  BeneficiaryChanged,
  LockAccepted,
  LockCanceled,
  SubjectTokenDestinationsApproved,
  SubjectTokenDestinationsRevoked,
} from "../../generated/templates/MoxieTokenLockWallet/MoxieTokenLockWallet"

import { TokenLockWallet, TokenLockManager, SubjectToken } from "../../generated/schema"
import { reduceSummaryBalance } from "./utils"
export function handleTokensReleased(event: TokensReleased): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensReleased = tokenLockWallet.tokensReleased.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()

  reduceSummaryBalance(event.params.amount)
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensWithdrawn = tokenLockWallet.tokensWithdrawn.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()

  reduceSummaryBalance(event.params.amount)
}

export function handleTokensRevoked(event: TokensRevoked): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensRevoked = tokenLockWallet.tokensRevoked.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()

  reduceSummaryBalance(event.params.amount)
}

export function handleManagerUpdated(event: ManagerUpdated): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  let manager = TokenLockManager.load(event.params._newManager.toHexString())
  if (manager == null) {
    log.error("Manager not found: {}", [event.params._newManager.toHexString()])
    throw new Error("Manager not found")
  }
  tokenLockWallet.manager = manager.id
  tokenLockWallet.save()
}

// export function handleApproveTokenDestinations(
//   event: ApproveTokenDestinations
// ): void {
//   let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
//   tokenLockWallet.tokenDestinationsApproved = true
//   tokenLockWallet.save()
// }

// export function handleRevokeTokenDestinations(
//   event: RevokeTokenDestinations
// ): void {
//   let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
//   tokenLockWallet.tokenDestinationsApproved = false
//   tokenLockWallet.save()
// }

export function handleTokenDestinationsApproved(
  event: TokenDestinationsApproved
): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokenDestinationsApproved = true
  tokenLockWallet.save()
}

export function handleTokenDestinationsRevoked(
  event: TokenDestinationsRevoked
): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokenDestinationsApproved = false
  tokenLockWallet.save()
}

export function handleBeneficiaryChanged(event: BeneficiaryChanged): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.beneficiary = event.params.newBeneficiary
  tokenLockWallet.save()
}

export function handleLockAccepted(event: LockAccepted): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.lockAccepted = true
  tokenLockWallet.save()
}
export function handleLockCanceled(event: LockCanceled): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  let manager = TokenLockManager.load(tokenLockWallet.manager)!
  manager.tokens = manager.tokens.plus(tokenLockWallet.balance)
  reduceSummaryBalance(tokenLockWallet.balance)
  tokenLockWallet.balance = BigInt.fromI32(0)
  tokenLockWallet.save()
}

export function handleSubjectTokenDestinationsApproved(event: SubjectTokenDestinationsApproved): void {
  let subjectId = getSubjectTokenId(event.address.toHexString(), event.params._subjectToken.toHexString())
  let subjectToken = SubjectToken.load(subjectId)
  if(subjectToken == null) {
    subjectToken = new SubjectToken(subjectId)
  }
  subjectToken.vestingContractAddress = event.address.toHexString()
  subjectToken.subjectToken = event.params._subjectToken
  subjectToken.tokenDestinationsApproved = true
  subjectToken.blockNumberUpdated = event.block.number
  subjectToken.save()
}

export function handleSubjectTokenDestinationsRevoked(event: SubjectTokenDestinationsRevoked): void {
  let subjectId = getSubjectTokenId(event.address.toHexString(), event.params._subjectToken.toHexString())
  let subjectToken = SubjectToken.load(subjectId)
  if(subjectToken == null) {
    subjectToken = new SubjectToken(event.params._subjectToken.toHexString())
  }
  subjectToken.tokenDestinationsApproved = false
  subjectToken.vestingContractAddress = event.address.toHexString().toLowerCase()
  subjectToken.subjectToken = event.params._subjectToken
  subjectToken.blockNumberUpdated = event.block.number
  subjectToken.save()
}

export function getSubjectTokenId(
  tokenLockWalletId: string,
  subject: string
): string {
  return tokenLockWalletId + "-" + subject
}