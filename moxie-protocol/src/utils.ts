import { Address, BigDecimal, BigInt, Bytes, ethereum, log, store } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { Transaction, BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectToken, SubjectTokenDailySnapshot, SubjectFeeTransfer, SubjectTokenHourlySnapshot, Summary, User, UserProtocolOrder, SubjectTokenRollingDailySnapshot } from "../generated/schema"
import { PCT_BASE, SECONDS_IN_DAY, SECONDS_IN_HOUR, SUMMARY_ID } from "./constants"

export function getOrCreateSubjectToken(tokenAddress: Address, block: ethereum.Block): SubjectToken {
  let subjectToken = SubjectToken.load(tokenAddress.toHexString())
  if (!subjectToken) {
    subjectToken = new SubjectToken(tokenAddress.toHexString())
    let token = ERC20.bind(tokenAddress)
    subjectToken.name = token.name()
    subjectToken.symbol = token.symbol()
    subjectToken.decimals = BigInt.fromI32(token.decimals())
    // setting default values for now
    subjectToken.reserve = BigInt.zero()
    subjectToken.reserveRatio = BigInt.zero()
    subjectToken.currentPriceinMoxie = BigDecimal.fromString("0")
    subjectToken.currentPriceinWeiInMoxie = BigDecimal.fromString("0")
    subjectToken.totalSupply = BigInt.zero()
    subjectToken.initialSupply = BigInt.zero()
    subjectToken.uniqueHolders = BigInt.zero()
    subjectToken.volume = BigInt.zero()
    subjectToken.beneficiaryFee = BigInt.zero()
    subjectToken.protocolFee = BigInt.zero()
    subjectToken.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    subjectToken.protocolTokenSpent = BigInt.zero()
    subjectToken.protocolTokenInvested = BigDecimal.fromString("0")
    saveSubjectToken(subjectToken, block)
  }
  return subjectToken
}

export function getOrCreatePortfolio(userAddress: Address, subjectAddress: Address, txHash: Bytes, block: ethereum.Block): Portfolio {
  let user = getOrCreateUser(userAddress, block)
  let portfolioId = userAddress.toHexString() + "-" + subjectAddress.toHexString()
  let portfolio = Portfolio.load(portfolioId)
  if (!portfolio) {
    portfolio = new Portfolio(portfolioId)
    let subjectToken = getOrCreateSubjectToken(subjectAddress, block)
    portfolio.user = user.id
    portfolio.subjectToken = subjectToken.id
    portfolio.balance = BigInt.zero()
    log.info("Portfolio {} initialized {} balance: {}", [portfolioId, txHash.toHexString(), portfolio.balance.toString()])
    portfolio.protocolTokenSpent = BigInt.zero()
    portfolio.protocolTokenInvested = BigDecimal.fromString("0")
    portfolio.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    savePortfolio(portfolio, block)
    // adding unique holders when a new portfolio is created
    subjectToken.uniqueHolders = subjectToken.uniqueHolders.plus(BigInt.fromI32(1))
    saveSubjectToken(subjectToken, block)
  }
  return portfolio
}

export function savePortfolio(portfolio: Portfolio, block: ethereum.Block): void {
  portfolio.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  portfolio.save()
}

export function getOrCreateUser(userAddress: Address, block: ethereum.Block): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.subjectFeeTransfer = []
    user.protocolTokenSpent = BigInt.zero()
    user.protocolTokenInvested = BigDecimal.fromString("0")
    user.protocolOrdersCount = BigInt.zero()
    user.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    saveUser(user, block)
  }
  return user
}
export function saveUser(user: User, block: ethereum.Block): void {
  user.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  user.save()
}

function createSubjectTokenHourlySnapshot(subjectToken: SubjectToken, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenHourlySnapshot(snapshotId)
    snapshot.startTimestamp = timestamp
    snapshot.startPrice = subjectToken.currentPriceinMoxie
    snapshot.startUniqueHolders = subjectToken.uniqueHolders
    snapshot.startVolume = subjectToken.volume
    snapshot.startBeneficiaryFee = subjectToken.beneficiaryFee
    snapshot.startProtocolFee = subjectToken.protocolFee
    snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.beneficiary = subjectToken.beneficiary
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.hourlyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.hourlyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.volume
  snapshot.hourlyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subjectToken.beneficiaryFee
  snapshot.hourlyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtocolFee = subjectToken.protocolFee
  snapshot.hourlyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.updatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  snapshot.save()
}

function getSnapshotId(subjectToken: SubjectToken, timestamp: BigInt): string {
  return subjectToken.id.concat("-").concat(timestamp.toString())
}

/**
 * This function tries to load hourly snapshot for the last 24 hours
 * @param subjectToken
 * @param timestamp
 * @param latestSnapshotId
 * @returns
 */
function loadSubjectTokenHourlySnapshotOneDayBack(subjectToken: SubjectToken, timestamp: BigInt, latestSnapshotId: string): SubjectTokenHourlySnapshot | null {
  let snapshotTimestamp = timestamp.minus(SECONDS_IN_DAY)
  for (let i = 0; i < 24; i++) {
    let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
    log.debug("loading hourly snapshot (try {}) for creating latestSnapshotId {} hourlySnapshotId {}", [i.toString(), latestSnapshotId, snapshotId])
    let snapshot = SubjectTokenHourlySnapshot.load(snapshotId)
    if (snapshot) {
      return snapshot
    }
    snapshotTimestamp = snapshotTimestamp.plus(SECONDS_IN_HOUR)
  }
  return null
}

function createSubjectTokenDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_DAY)).plus(SECONDS_IN_DAY)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenDailySnapshot(snapshotId)
    snapshot.startTimestamp = timestamp
    snapshot.startPrice = subjectToken.currentPriceinMoxie
    snapshot.startUniqueHolders = subjectToken.uniqueHolders
    snapshot.startVolume = subjectToken.volume
    snapshot.startBeneficiaryFee = subjectToken.beneficiaryFee
    snapshot.startProtocolFee = subjectToken.protocolFee
    snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.beneficiary = subjectToken.beneficiary
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.volume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subjectToken.beneficiaryFee
  snapshot.dailyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtocolFee = subjectToken.protocolFee
  snapshot.dailyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.updatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  snapshot.save()
}

function createSubjectTokenRollingDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenRollingDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenRollingDailySnapshot(snapshotId)
    let hourlySnapshot = loadSubjectTokenHourlySnapshotOneDayBack(subjectToken, snapshotTimestamp, snapshotId)
    if (hourlySnapshot) {
      snapshot.startTimestamp = hourlySnapshot.endTimestamp
      snapshot.startPrice = hourlySnapshot.endPrice
      snapshot.startUniqueHolders = hourlySnapshot.endUniqueHolders
      snapshot.startVolume = hourlySnapshot.endVolume
      snapshot.startBeneficiaryFee = hourlySnapshot.endBeneficiaryFee
      snapshot.startProtocolFee = hourlySnapshot.endProtocolFee
      snapshot.createdAtBlockInfo = hourlySnapshot.createdAtBlockInfo
      snapshot.initialHourlySnapshot = hourlySnapshot.id
    } else {
      snapshot.startTimestamp = timestamp
      snapshot.startPrice = subjectToken.currentPriceinMoxie
      snapshot.startUniqueHolders = subjectToken.uniqueHolders
      snapshot.startVolume = subjectToken.volume
      snapshot.startBeneficiaryFee = subjectToken.beneficiaryFee
      snapshot.startProtocolFee = subjectToken.protocolFee
      snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo
    }
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.beneficiary = subjectToken.beneficiary
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.volume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endBeneficiaryFee = subjectToken.beneficiaryFee
  snapshot.dailyBeneficiaryFeeChange = snapshot.endBeneficiaryFee.minus(snapshot.startBeneficiaryFee) // TODO: confirm

  snapshot.endProtocolFee = subjectToken.protocolFee
  snapshot.dailyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.updatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  snapshot.save()

  // deleting existing rolling daily snapshot for subject token
  let oldRollingDailySnapshot = subjectToken.latestRollingDailySnapshot
  if (oldRollingDailySnapshot) {
    log.warning("Deleting old rolling daily snapshot {}", [oldRollingDailySnapshot])
    store.remove("SubjectTokenRollingDailySnapshot", oldRollingDailySnapshot)
  }
  subjectToken.latestRollingDailySnapshot = snapshotId
  subjectToken.save()
}

export function saveSubjectToken(subject: SubjectToken, block: ethereum.Block): void {
  subject.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  subject.save()
  createSubjectTokenHourlySnapshot(subject, block.timestamp)
  createSubjectTokenDailySnapshot(subject, block.timestamp)
  createSubjectTokenRollingDailySnapshot(subject, block.timestamp)
}

export function loadSummary(): Summary {
  let summary = Summary.load(SUMMARY_ID)
  if (!summary) {
    throw new Error("Summary not found!")
  }
  return summary
}

export function getOrCreateBlockInfo(block: ethereum.Block): BlockInfo {
  let blockInfo = BlockInfo.load(block.number.toString())
  if (!blockInfo) {
    blockInfo = new BlockInfo(block.number.toString())
    blockInfo.timestamp = block.timestamp
    blockInfo.blockNumber = block.number
    blockInfo.hash = block.hash
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

export function getOrCreateTransactionId(txHash: Bytes): string {
  let transaction = Transaction.load(txHash.toHexString())
  if (!transaction) {
    transaction = new Transaction(txHash.toHexString())
    transaction.save()
  }
  return transaction.id
}

export function createProtocolFeeTransfer(event: ethereum.Event, blockInfo: BlockInfo, order: Order, subjectToken: SubjectToken, beneficiary: ProtocolFeeBeneficiary, fee: BigInt): void {
  let protocolFeeTransfer = new ProtocolFeeTransfer(getTxEntityId(event))
  protocolFeeTransfer.txHash = event.transaction.hash
  protocolFeeTransfer.blockInfo = blockInfo.id
  protocolFeeTransfer.order = order.id
  protocolFeeTransfer.subjectToken = subjectToken.id
  protocolFeeTransfer.beneficiary = beneficiary.id
  protocolFeeTransfer.amount = fee
  protocolFeeTransfer.save()
}

export function createSubjectFeeTransfer(event: ethereum.Event, blockInfo: BlockInfo, order: Order, subjectToken: SubjectToken, beneficiary: string | null, fee: BigInt): void {
  let subjectFeeTransfer = new SubjectFeeTransfer(getTxEntityId(event))
  subjectFeeTransfer.txHash = event.transaction.hash
  subjectFeeTransfer.blockInfo = blockInfo.id
  subjectFeeTransfer.order = order.id
  subjectFeeTransfer.subjectToken = subjectToken.id
  subjectFeeTransfer.amount = fee
  subjectFeeTransfer.beneficiary = beneficiary

  subjectFeeTransfer.save()
}

export function createUserProtocolOrder(user: User, order: Order, block: ethereum.Block): void {
  user.protocolOrdersCount = user.protocolOrdersCount.plus(BigInt.fromI32(1))
  saveUser(user, block)

  order.userProtocolOrderIndex = user.protocolOrdersCount
  order.save()

  let entityId = user.id.concat("-").concat(user.protocolOrdersCount.toString())
  let userProtocolOrder = new UserProtocolOrder(entityId)
  userProtocolOrder.user = user.id
  userProtocolOrder.order = order.id
  userProtocolOrder.subjectToken = order.subjectToken
  userProtocolOrder.userProtocolOrderIndex = user.protocolOrdersCount
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
