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
} from "../../generated/templates/MoxieTokenLockWallet/MoxieTokenLockWallet"

import { TokenLockWallet, TokenManager } from "../../generated/schema"

export function handleTokensReleased(event: TokensReleased): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensReleased = tokenLockWallet.tokensReleased.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensWithdrawn = tokenLockWallet.tokensWithdrawn.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()
}

export function handleTokensRevoked(event: TokensRevoked): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.tokensRevoked = tokenLockWallet.tokensRevoked.plus(
    event.params.amount
  )
  tokenLockWallet.balance = tokenLockWallet.balance.minus(event.params.amount)
  tokenLockWallet.save()
}

export function handleManagerUpdated(event: ManagerUpdated): void {
  let tokenLockWallet = TokenLockWallet.load(event.address.toHexString())!
  tokenLockWallet.manager = event.params._newManager.toHexString()
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
  let manager = TokenManager.load(tokenLockWallet.manager)!
  manager.tokens = manager.tokens.plus(tokenLockWallet.balance)
  tokenLockWallet.balance = BigInt.fromI32(0)
  tokenLockWallet.save()
}
