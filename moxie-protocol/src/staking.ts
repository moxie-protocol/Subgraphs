import { store } from "@graphprotocol/graph-ts"

import { Lock, LockExtended, Withdraw } from '../generated/Staking/Staking'
import { LockInfo, Portfolio } from '../generated/schema'
import { getOrCreateBlockInfo, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateUser, savePortfolio } from './utils'
export function handleLock(event: Lock): void {
 let lockInfo = new LockInfo(event.params._index.toString())
 lockInfo.txHash = event.transaction.hash
 lockInfo.logIndex = event.logIndex
 lockInfo.user = getOrCreateUser(event.params._user, event.block).id
 let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
 subjectToken.totalStaked = subjectToken.totalStaked.plus(event.params._amount)
 subjectToken.save()

 lockInfo.subjectToken = subjectToken.id

 let portfolio = getOrCreatePortfolio(event.params._user, event.params._subject, event.transaction.hash, event.block)
 portfolio.stakedBalance = portfolio.stakedBalance.plus(event.params._amount)
 portfolio.unstakedBalance = portfolio.unstakedBalance.minus(event.params._amount)
 savePortfolio(portfolio, event.block)

 lockInfo.portfolio = portfolio.id
 lockInfo.subject = getOrCreateUser(event.params._subject, event.block).id
 lockInfo.unlockTimeInSec = event.params._unlockTimeInSec
 lockInfo.amount = event.params._amount
 lockInfo.lockPeriodInSec = event.params._lockPeriodInSec
 lockInfo.createdAtBlockInfo = getOrCreateBlockInfo(event.block).id
 lockInfo.save()
}

export function handleLockExtended(event: LockExtended): void {
 let portfolio = getOrCreatePortfolio(event.params._user, event.params._subject, event.transaction.hash, event.block)
 portfolio.stakedBalance = portfolio.stakedBalance.minus(event.params._amount)
 portfolio.unstakedBalance = portfolio.unstakedBalance.plus(event.params._amount)
 savePortfolio(portfolio, event.block)
 // loop over the array of lock indexes and delete the lock info
 let lockIndexes = event.params._indexes
 for (let i = 0; i < lockIndexes.length; i++) {
  store.remove("LockInfo", lockIndexes[i].toString())
 }
}

export function handleWithdraw(event: Withdraw): void {
 // address indexed _user, address indexed _subject, address indexed _subjectToken, uint256[] _indexes, uint256 _amount
 let portfolio = getOrCreatePortfolio(event.params._user, event.params._subject, event.transaction.hash, event.block)
 portfolio.stakedBalance = portfolio.stakedBalance.minus(event.params._amount)
 portfolio.unstakedBalance = portfolio.unstakedBalance.plus(event.params._amount)
 savePortfolio(portfolio, event.block)

 let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
 subjectToken.totalStaked = subjectToken.totalStaked.minus(event.params._amount)
 subjectToken.save()
 // loop over the array of lock indexes and delete the lock info
 let lockIndexes = event.params._indexes
 for (let i = 0; i < lockIndexes.length; i++) {
  store.remove("LockInfo", lockIndexes[i].toString())
 }
}