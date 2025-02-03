import {
  Address,
  BigDecimal,
  BigInt,
  log,
  store,
} from "@graphprotocol/graph-ts"

import { Lock, LockExtended, Withdraw } from "../generated/Staking/Staking"
import { LockInfo, Portfolio } from "../generated/schema"
import {
  getOrCreateBlockInfo,
  getOrCreatePortfolio,
  getOrCreateSubjectToken,
  getOrCreateSummary,
  getOrCreateUser,
  savePortfolio,
  saveUser,
} from "./utils"
export function handleLock(event: Lock): void {
  let lockInfo = new LockInfo(event.params._index.toString())
  lockInfo.txHash = event.transaction.hash
  lockInfo.isBuy = event.params._moxieDepositAmount.notEqual(BigInt.fromI32(0))
  lockInfo.logIndex = event.logIndex

  let subjectToken = getOrCreateSubjectToken(
    event.params._subjectToken,
    event.block
  )
  subjectToken.totalStaked = subjectToken.totalStaked.plus(event.params._amount)
  subjectToken.save()

  let user = getOrCreateUser(event.params._user, event.block)
  user.protocolTokenInvested = user.protocolTokenInvested.plus(
    new BigDecimal(event.params._moxieDepositAmount)
  )
  saveUser(user, event.block)
  let beneficiaryPortfolio = getOrCreatePortfolio(
    event.params._user,
    event.params._subjectToken,
    event.transaction.hash,
    event.block
  )
  beneficiaryPortfolio.protocolTokenInvested = beneficiaryPortfolio.protocolTokenInvested.plus(
    new BigDecimal(event.params._moxieDepositAmount)
  )
  beneficiaryPortfolio.stakedBalance = beneficiaryPortfolio.stakedBalance.plus(
    event.params._amount
  )
  savePortfolio(beneficiaryPortfolio, event.block, false)

  if (event.params._buyer != Address.zero()) {
    let buyerPortfolio = getOrCreatePortfolio(
      event.params._buyer,
      event.params._subjectToken,
      event.transaction.hash,
      event.block
    )
    lockInfo.buyerPortfolio = buyerPortfolio.id
  }
  lockInfo.user = user.id
  lockInfo.portfolio = beneficiaryPortfolio.id
  lockInfo.subjectToken = subjectToken.id
  lockInfo.subject = getOrCreateUser(event.params._subject, event.block).id
  lockInfo.unlockTimeInSec = event.params._unlockTimeInSec
  lockInfo.amount = event.params._amount
  lockInfo.lockPeriodInSec = event.params._lockPeriodInSec
  lockInfo.createdAtBlockInfo = getOrCreateBlockInfo(event.block).id
  lockInfo.createdAtBlockNumber = event.block.number
  lockInfo.moxieDepositAmount = event.params._moxieDepositAmount
  lockInfo.save()

  let summary = getOrCreateSummary()
  summary.totalStakedSubjectTokens = summary.totalStakedSubjectTokens.plus(
    event.params._amount
  )
  summary.save()
}

export function handleLockExtended(event: LockExtended): void {
  let portfolio = getOrCreatePortfolio(
    event.params._user,
    event.params._subjectToken,
    event.transaction.hash,
    event.block
  )
  portfolio.stakedBalance = portfolio.stakedBalance.minus(event.params._amount)
  savePortfolio(portfolio, event.block, false)

  // reduce total staked amount from subject token
  let subjectToken = getOrCreateSubjectToken(
    event.params._subjectToken,
    event.block
  )
  subjectToken.totalStaked = subjectToken.totalStaked.minus(
    event.params._amount
  )
  subjectToken.save()
  // loop over the array of lock indexes and delete the lock info
  let lockIndexes = event.params._indexes
  for (let i = 0; i < lockIndexes.length; i++) {
    store.remove("LockInfo", lockIndexes[i].toString())
  }

  let summary = getOrCreateSummary()
  summary.totalStakedSubjectTokens = summary.totalStakedSubjectTokens.minus(
    event.params._amount
  )
  summary.save()
}

export function handleWithdraw(event: Withdraw): void {
  // address indexed _user, address indexed _subject, address indexed _subjectToken, uint256[] _indexes, uint256 _amount
  let portfolio = getOrCreatePortfolio(
    event.params._user,
    event.params._subjectToken,
    event.transaction.hash,
    event.block
  )
  portfolio.stakedBalance = portfolio.stakedBalance.minus(event.params._amount)
  savePortfolio(portfolio, event.block, false)

  let subjectToken = getOrCreateSubjectToken(
    event.params._subjectToken,
    event.block
  )
  subjectToken.totalStaked = subjectToken.totalStaked.minus(
    event.params._amount
  )
  subjectToken.save()
  // loop over the array of lock indexes and delete the lock info
  let lockIndexes = event.params._indexes
  for (let i = 0; i < lockIndexes.length; i++) {
    store.remove("LockInfo", lockIndexes[i].toString())
  }

  let summary = getOrCreateSummary()
  summary.totalStakedSubjectTokens = summary.totalStakedSubjectTokens.minus(
    event.params._amount
  )
  summary.save()
}
