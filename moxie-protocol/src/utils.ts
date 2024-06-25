import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { Portfolio, Subject, SubjectSnapshot, User } from "../generated/schema"

export function getOrCreateSubject(tokenAddress: Address): Subject {
  let subject = Subject.load(tokenAddress.toHexString())
  if (!subject) {
    subject = new Subject(tokenAddress.toHexString())
    let token = ERC20.bind(tokenAddress)
    subject.name = token.name()
    subject.symbol = token.symbol()
    subject.decimals = BigInt.fromI32(token.decimals())
    // setting default values for now
    subject.reserve = BigInt.fromI32(0)
    subject.currentPrice = BigDecimal.fromString("0")
    subject.totalSupply = BigInt.fromI32(0)
    subject.uniqueHolders = BigInt.fromI32(0)
    subject.volume = BigInt.fromI32(0)
    subject.holders = []
    subject.save()
  }
  return subject
}

export function getOrCreatePortfolio(userAddress: Address, subjectAddress: Address, timestamp: BigInt): Portfolio {
  let user = getOrCreateUser(userAddress)
  let portfolioId = userAddress.toHexString() + "-" + subjectAddress.toHexString()
  let portfolio = Portfolio.load(portfolioId)
  if (!portfolio) {
    portfolio = new Portfolio(portfolioId)
    let subject = getOrCreateSubject(subjectAddress)
    // incrementing uniqueHolders
    subject.uniqueHolders = subject.uniqueHolders.plus(BigInt.fromI32(1))
    saveSubject(subject, timestamp)
    portfolio.user = user.id
    portfolio.subject = subject.id
    portfolio.subjectTokenQuantity = BigInt.fromI32(0)
    portfolio.protocolTokenSpent = BigInt.fromI32(0)
    portfolio.save()
  }
  return portfolio
}

export function getOrCreateUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.buyOrders = []
    user.sellOrders = []
    user.save()
  }
  return user
}

const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
function createSubjectSnapshot(subject: Subject, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = subject.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectSnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectSnapshot(snapshotId)
    snapshot.startPrice = subject.currentPrice
    snapshot.startUniqueHolders = subject.uniqueHolders
    snapshot.startVolume = subject.volume
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subject = subject.id
  snapshot.name = subject.name
  snapshot.symbol = subject.symbol
  snapshot.decimals = subject.decimals
  snapshot.beneficiary = subject.beneficiary
  snapshot.reserve = subject.reserve
  snapshot.endPrice = subject.currentPrice
  snapshot.hourlyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subject.totalSupply

  snapshot.endUniqueHolders = subject.uniqueHolders
  snapshot.hourlyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subject.volume
  snapshot.hourlyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm
  snapshot.save()
}

export function saveSubject(subject: Subject, timestamp: BigInt): void {
  subject.save()
  createSubjectSnapshot(subject, timestamp)
}
