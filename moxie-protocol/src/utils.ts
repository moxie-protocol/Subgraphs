import { Address, BigDecimal, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { BlockInfo, Portfolio, ProtocolFeeBeneficiary, Subject, SubjectDailySnapshot, SubjectHourlySnapshot, Summary, User } from "../generated/schema"
import { PCT_BASE, SECONDS_IN_DAY, SECONDS_IN_HOUR, SUMMARY_ID } from "./constants"

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
    subject.currentPriceinMoxie = BigDecimal.fromString("0")
    subject.currentPriceinWeiInMoxie = BigDecimal.fromString("0")
    subject.totalSupply = BigInt.fromI32(0)
    subject.uniqueHolders = BigInt.fromI32(0)
    subject.volume = BigInt.fromI32(0)
    subject.beneficiaryFee = BigInt.fromI32(0)
    subject.protocolFee = BigInt.fromI32(0)
    subject.holders = []
    subject.save()
  }
  return subject
}

export function getOrCreatePortfolio(userAddress: Address, subjectAddress: Address, txHash: Bytes): Portfolio {
  let user = getOrCreateUser(userAddress)
  let portfolioId = userAddress.toHexString() + "-" + subjectAddress.toHexString()
  let portfolio = Portfolio.load(portfolioId)
  if (!portfolio) {
    portfolio = new Portfolio(portfolioId)
    let subject = getOrCreateSubject(subjectAddress)
    portfolio.user = user.id
    portfolio.subject = subject.id
    portfolio.balance = BigInt.fromI32(0)
    log.info("Portfolio {} initialized {} balance: {}", [portfolioId, txHash.toHexString(), portfolio.balance.toString()])
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
    user.subjectFeeTransfer = []
    user.protocolTokenSpent = BigInt.fromI32(0)
    user.save()
  }
  return user
}

function createSubjectHourlySnapshot(subject: Subject, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = subject.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectHourlySnapshot(snapshotId)
    snapshot.startPrice = subject.currentPriceinMoxie
    snapshot.startUniqueHolders = subject.uniqueHolders
    snapshot.startVolume = subject.volume
    snapshot.startBeneficiaryFee = subject.beneficiaryFee
    snapshot.startProtocolFee = subject.protocolFee
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subject = subject.id

  snapshot.beneficiary = subject.beneficiary
  snapshot.reserve = subject.reserve
  snapshot.endPrice = subject.currentPriceinMoxie
  snapshot.hourlyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subject.totalSupply

  snapshot.endUniqueHolders = subject.uniqueHolders
  snapshot.hourlyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subject.volume
  snapshot.hourlyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subject.beneficiaryFee
  snapshot.hourlyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtocolFee = subject.protocolFee
  snapshot.hourlyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.save()
}

function createSubjectDailySnapshot(subject: Subject, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_DAY)).plus(SECONDS_IN_DAY)
  let snapshotId = subject.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectDailySnapshot(snapshotId)
    snapshot.startPrice = subject.currentPriceinMoxie
    snapshot.startUniqueHolders = subject.uniqueHolders
    snapshot.startVolume = subject.volume
    snapshot.startBeneficiaryFee = subject.beneficiaryFee
    snapshot.startProtocolFee = subject.protocolFee
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subject = subject.id

  snapshot.beneficiary = subject.beneficiary
  snapshot.reserve = subject.reserve
  snapshot.endPrice = subject.currentPriceinMoxie
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subject.totalSupply

  snapshot.endUniqueHolders = subject.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subject.volume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subject.beneficiaryFee
  snapshot.dailyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtocolFee = subject.protocolFee
  snapshot.dailyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.save()
}

export function saveSubject(subject: Subject, event: ethereum.Event): void {
  subject.blockInfo = getOrCreateBlockInfo(event).id
  subject.save()
  createSubjectDailySnapshot(subject, event.block.timestamp)
  createSubjectHourlySnapshot(subject, event.block.timestamp)
}

export function loadSummary(): Summary {
  let summary = Summary.load(SUMMARY_ID)
  if (!summary) {
    throw new Error("Summary not found!")
  }
  return summary
}

export function getOrCreateBlockInfo(event: ethereum.Event): BlockInfo {
  let blockInfo = BlockInfo.load(event.block.number.toString())
  if (!blockInfo) {
    blockInfo = new BlockInfo(event.block.number.toString())
    blockInfo.timestamp = event.block.timestamp
    blockInfo.blockNumber = event.block.number
    blockInfo.hash = event.block.hash
    blockInfo.save()
  }
  return blockInfo
}

export function getTxEntityId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
}

export function handleNewBeneficiary(beneficiary: Address): void {
  let protocolFeeBeneficiaryEntity = new ProtocolFeeBeneficiary(beneficiary.toHexString())
  protocolFeeBeneficiaryEntity.beneficiary = beneficiary
  protocolFeeBeneficiaryEntity.totalFees = BigInt.fromI32(0)
  protocolFeeBeneficiaryEntity.save()

  let summary = loadSummary()
  summary.activeProtocolFeeBeneficiary = beneficiary.toHexString()
  summary.save()
}

export class Fees {
  public protocolFee: BigInt
  public subjectFee: BigInt
  constructor(_protocolFee: BigInt, _subjectFee: BigInt) {
    this.protocolFee = _protocolFee
    this.subjectFee = _subjectFee
  }
}
export function calculateBuySideFee(_depositAmount: BigInt): Fees {
  let summary = loadSummary()
  let protocolFee_ = _depositAmount.times(summary.protocolBuyFeePct).div(PCT_BASE)
  let subjectFee_ = _depositAmount.times(summary.subjectBuyFeePct).div(PCT_BASE)
  return new Fees(protocolFee_, subjectFee_)
}

export function calculateSellSideFee(_depositAmount: BigInt): Fees {
  let summary = loadSummary()
  let protocolFee_ = _depositAmount.times(summary.protocolSellFeePct).div(PCT_BASE)
  let subjectFee_ = _depositAmount.times(summary.subjectSellFeePct).div(PCT_BASE)
  return new Fees(protocolFee_, subjectFee_)
}
