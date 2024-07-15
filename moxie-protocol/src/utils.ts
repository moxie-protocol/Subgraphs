import { Address, BigDecimal, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { AuctionTransfer, BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, ProtocolFeeTransfer, Subject, SubjectDailySnapshot, SubjectFeeTransfer, SubjectHourlySnapshot, Summary, User, UserProtocolOrder } from "../generated/schema"
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
    subject.reserve = BigInt.zero()
    subject.currentPrice = BigDecimal.fromString("0")
    subject.totalSupply = BigInt.zero()
    subject.uniqueHolders = BigInt.zero()
    subject.volume = BigInt.zero()
    subject.beneficiaryFee = BigInt.zero()
    subject.protcolFee = BigInt.zero()
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
    portfolio.balance = BigInt.zero()
    log.info("Portfolio {} initialized {} balance: {}", [portfolioId, txHash.toHexString(), portfolio.balance.toString()])
    portfolio.protocolTokenSpent = BigInt.zero()
    portfolio.protocolTokenInvestment = BigDecimal.fromString("0")
    portfolio.save()
  }
  return portfolio
}

export function getOrCreateUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.subjectFeeTransfer = []
    user.protocolTokenSpent = BigInt.zero()
    user.protocolTokenInvestment = BigDecimal.fromString("0")
    user.protocolOrdersCount = BigInt.zero()
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
    snapshot.startPrice = subject.currentPrice
    snapshot.startUniqueHolders = subject.uniqueHolders
    snapshot.startVolume = subject.volume
    snapshot.startBeneficiaryFee = subject.beneficiaryFee
    snapshot.startProtcolFee = subject.protcolFee
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subject = subject.id

  snapshot.beneficiary = subject.beneficiary
  snapshot.reserve = subject.reserve
  snapshot.endPrice = subject.currentPrice
  snapshot.hourlyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subject.totalSupply

  snapshot.endUniqueHolders = subject.uniqueHolders
  snapshot.hourlyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subject.volume
  snapshot.hourlyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subject.beneficiaryFee
  snapshot.hourlyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtcolFee = subject.protcolFee
  snapshot.hourlyProtcolFeeChange = snapshot.endProtcolFee.minus(snapshot.startProtcolFee) // TODO: confirm
  snapshot.save()
}

function createSubjectDailySnapshot(subject: Subject, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_DAY)).plus(SECONDS_IN_DAY)
  let snapshotId = subject.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectDailySnapshot(snapshotId)
    snapshot.startPrice = subject.currentPrice
    snapshot.startUniqueHolders = subject.uniqueHolders
    snapshot.startVolume = subject.volume
    snapshot.startBeneficiaryFee = subject.beneficiaryFee
    snapshot.startProtcolFee = subject.protcolFee
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subject = subject.id

  snapshot.beneficiary = subject.beneficiary
  snapshot.reserve = subject.reserve
  snapshot.endPrice = subject.currentPrice
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subject.totalSupply

  snapshot.endUniqueHolders = subject.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subject.volume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subject.beneficiaryFee
  snapshot.dailyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtcolFee = subject.protcolFee
  snapshot.dailyProtcolFeeChange = snapshot.endProtcolFee.minus(snapshot.startProtcolFee) // TODO: confirm
  snapshot.save()
}

export function saveSubject(subject: Subject, timestamp: BigInt): void {
  subject.save()
  createSubjectDailySnapshot(subject, timestamp)
  createSubjectHourlySnapshot(subject, timestamp)
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
  let protcolFeeBeneficiaryEntity = new ProtocolFeeBeneficiary(beneficiary.toHexString())
  protcolFeeBeneficiaryEntity.beneficiary = beneficiary
  protcolFeeBeneficiaryEntity.totalFees = BigInt.zero()
  protcolFeeBeneficiaryEntity.save()

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

export function getOrCreateAuctionTransferId(txHash: Bytes): string {
  let auctionTransfer = AuctionTransfer.load(txHash.toHexString())
  if (!auctionTransfer) {
    auctionTransfer = new AuctionTransfer(txHash.toHexString())
    auctionTransfer.save()
  }
  return auctionTransfer.id
}

export function createProtocolFeeTransfer(event: ethereum.Event, blockInfo: BlockInfo, order: Order, subject: Subject, beneficiary: ProtocolFeeBeneficiary, fee: BigInt): void {
  let protocolFeeTransfer = new ProtocolFeeTransfer(getTxEntityId(event))
  protocolFeeTransfer.txHash = event.transaction.hash
  protocolFeeTransfer.blockInfo = blockInfo.id
  protocolFeeTransfer.order = order.id
  protocolFeeTransfer.subject = subject.id
  protocolFeeTransfer.beneficiary = beneficiary.id
  protocolFeeTransfer.amount = fee
  protocolFeeTransfer.save()
}

export function createSubjectFeeTransfer(event: ethereum.Event, blockInfo: BlockInfo, order: Order, subject: Subject, beneficiary: string | null, fee: BigInt): void {
  let subjectFeeTransfer = new SubjectFeeTransfer(getTxEntityId(event))
  subjectFeeTransfer.txHash = event.transaction.hash
  subjectFeeTransfer.blockInfo = blockInfo.id
  subjectFeeTransfer.order = order.id
  subjectFeeTransfer.subject = subject.id
  subjectFeeTransfer.amount = fee
  subjectFeeTransfer.beneficiary = beneficiary

  subjectFeeTransfer.save()
}

export function createUserProtocolOrder(user: User, order: Order): void {
  user.protocolOrdersCount = user.protocolOrdersCount.plus(BigInt.fromI32(1))
  user.save()

  order.userProtocolOrderIndex = user.protocolOrdersCount
  order.save()

  let entityId = user.id.concat("-").concat(user.protocolOrdersCount.toString())
  let userProtocolOrder = new UserProtocolOrder(entityId)
  userProtocolOrder.user = user.id
  userProtocolOrder.order = order.id
  userProtocolOrder.subjectToken = order.subjectToken
  userProtocolOrder.save()
}

export function loadProtocolOrder(user: User, index: BigInt): Order {
  let entityId = user.id.concat("-").concat(index.toString())
  let userProtocolOrder = UserProtocolOrder.load(entityId)
  if (!userProtocolOrder) {
    throw new Error("UserProtocolOrder not found for entityId: " + entityId)
  }
  let order = Order.load(userProtocolOrder.order)
  if (!order) {
    throw new Error("Order not found for entityId: " + entityId)
  }
  return order
}
