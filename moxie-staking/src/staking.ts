
import { Lock } from "../generated/Staking/Staking"
import { LockInfo } from "../generated/schema"
export function handleLock(event: Lock): void {
  let lockInfo = new LockInfo(event.params._index.toString())
  lockInfo.txHash = event.transaction.hash
  lockInfo.logIndex = event.logIndex
  lockInfo.user = event.params._user
  lockInfo.subjectToken = event.params._subjectToken
  lockInfo.subject = event.params._subject
  lockInfo.unlockTimeInSec = event.params._unlockTimeInSec
  lockInfo.amount = event.params._amount
  lockInfo.isBuy = event.params._isBuy
  lockInfo.lockPeriodInSec = event.params._lockPeriodInSec
  lockInfo.createdAtBlockNumber = event.block.number
  lockInfo.save()
}
