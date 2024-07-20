import { Address, BigDecimal, BigInt, Bytes, ethereum, log, store } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { Transaction, BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectToken, SubjectTokenDailySnapshot, SubjectFeeTransfer, SubjectTokenHourlySnapshot, Summary, User, UserProtocolOrder, SubjectTokenRollingDailySnapshot, Auction } from "../generated/schema"
import { ONBOARDING_STATUS_ONBOARDING_INITIALIZED, PCT_BASE, SECONDS_IN_DAY, SECONDS_IN_HOUR, SUMMARY_ID } from "./constants"

export function getOrCreateSubjectToken(subjectTokenAddress: Address, auction: Auction | null, block: ethereum.Block): SubjectToken {
  let subjectToken = SubjectToken.load(subjectTokenAddress.toHexString())
  if (!subjectToken) {
    subjectToken = new SubjectToken(subjectTokenAddress.toHexString())
    let token = ERC20.bind(subjectTokenAddress)
    subjectToken.name = token.name()
    subjectToken.symbol = token.symbol()
    subjectToken.decimals = BigInt.fromI32(token.decimals())
    // setting default values for now
    subjectToken.reserve = BigInt.zero()
    subjectToken.reserveRatio = BigInt.zero()
    subjectToken.currentPriceinMoxie = BigDecimal.fromString("0")
    subjectToken.currentPriceInWeiInMoxie = BigDecimal.fromString("0")
    subjectToken.totalSupply = BigInt.zero()
    subjectToken.initialSupply = BigInt.zero()
    subjectToken.uniqueHolders = BigInt.zero()
    subjectToken.lifetimeVolume = BigInt.zero()
    subjectToken.subjectFee = BigInt.zero()
    subjectToken.protocolFee = BigInt.zero()
    subjectToken.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    subjectToken.buySideVolume = BigInt.zero()
    subjectToken.sellSideVolume = BigInt.zero()
    subjectToken.protocolTokenInvested = BigDecimal.fromString("0")
    subjectToken.status = ONBOARDING_STATUS_ONBOARDING_INITIALIZED
    if (auction) {
      subjectToken.auction = auction.id
    }
    subjectToken.hourlySnapshotEndTimestamps = []
    saveSubjectToken(subjectToken, block)
  }
  return subjectToken
}

export function getPortfolioId(userAddress: Address, subjectAddress: Address): string {
  return userAddress.toHexString() + "-" + subjectAddress.toHexString()
}

export function getOrCreatePortfolio(userAddress: Address, subjectAddress: Address, txHash: Bytes, block: ethereum.Block): Portfolio {
  let user = getOrCreateUser(userAddress, block)
  let portfolioId = getPortfolioId(userAddress, subjectAddress)
  let portfolio = Portfolio.load(portfolioId)
  if (!portfolio) {
    portfolio = new Portfolio(portfolioId)
    let subjectToken = getOrCreateSubjectToken(subjectAddress, null, block)
    portfolio.user = user.id
    portfolio.subjectToken = subjectToken.id
    portfolio.balance = BigInt.zero()
    log.info("Portfolio {} initialized {} balance: {}", [portfolioId, txHash.toHexString(), portfolio.balance.toString()])
    portfolio.buyVolume = BigInt.zero()
    portfolio.sellVolume = BigInt.zero()
    portfolio.protocolTokenInvested = BigDecimal.fromString("0")
    portfolio.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    portfolio.subjectTokenBuyVolume = BigInt.zero()
    savePortfolio(portfolio, block)
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
    user.buyVolume = BigInt.zero()
    user.sellVolume = BigInt.zero()
    user.protocolTokenInvested = BigDecimal.fromString("0")
    user.protocolOrdersCount = BigInt.zero()
    user.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    saveUser(user, block)
    let summary = getOrCreateSummary()
    summary.numberOfUsers = summary.numberOfUsers.plus(BigInt.fromI32(1))
    summary.save()
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
    snapshot.startVolume = subjectToken.lifetimeVolume
    snapshot.startSubjectFee = subjectToken.subjectFee
    snapshot.startProtocolFee = subjectToken.protocolFee
    snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo

    let hourlySnapshotEndTimestamps = subjectToken.hourlySnapshotEndTimestamps
    hourlySnapshotEndTimestamps.push(snapshotTimestamp)
    subjectToken.hourlySnapshotEndTimestamps = hourlySnapshotEndTimestamps
    subjectToken.save()
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.subject = subjectToken.subject
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.hourlyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.hourlyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.lifetimeVolume
  snapshot.hourlyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endSubjectFee = subjectToken.subjectFee
  snapshot.hourlySubjectFeeChange = snapshot.endSubjectFee.minus(snapshot.startSubjectFee) // TODO: confirm

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
function loadSubjectTokenHourlySnapshotOneDayBack(subjectToken: SubjectToken, timestamp: BigInt): SubjectTokenHourlySnapshot {
  let time24HourAgo = timestamp.minus(SECONDS_IN_DAY)

  let snapshotTimestamp = findClosest(subjectToken.hourlySnapshotEndTimestamps, time24HourAgo)

  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    throw new Error("Snapshot not found for subject token: " + subjectToken.id + " and timestamp: " + timestamp.toString())
  }
  return snapshot
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
    snapshot.startVolume = subjectToken.lifetimeVolume
    snapshot.startSubjectFee = subjectToken.subjectFee
    snapshot.startProtocolFee = subjectToken.protocolFee
    snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.subject = subjectToken.subject
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.lifetimeVolume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endSubjectFee = subjectToken.subjectFee
  snapshot.dailySubjectFeeChange = snapshot.endSubjectFee.minus(snapshot.startSubjectFee) // TODO: confirm

  snapshot.endProtocolFee = subjectToken.protocolFee
  snapshot.dailyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.updatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  snapshot.save()
}

/**
 * This function creates a rolling daily snapshot for the subject token
 * It takes a timestamp and finds the closest hourly snapshot 24 hour before as a startpoint
 * function also deletes the existing rolling daily snapshot for the subject token
 * @param subjectToken 
 * @param timestamp 
 */
function createSubjectTokenRollingDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenRollingDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenRollingDailySnapshot(snapshotId)
    let hourlySnapshot = loadSubjectTokenHourlySnapshotOneDayBack(subjectToken, snapshotTimestamp)
    snapshot.startTimestamp = hourlySnapshot.endTimestamp
    snapshot.startPrice = hourlySnapshot.endPrice
    snapshot.startUniqueHolders = hourlySnapshot.endUniqueHolders
    snapshot.startVolume = hourlySnapshot.endVolume
    snapshot.startSubjectFee = hourlySnapshot.endSubjectFee
    snapshot.startProtocolFee = hourlySnapshot.endProtocolFee
    snapshot.createdAtBlockInfo = hourlySnapshot.createdAtBlockInfo
    snapshot.initialHourlySnapshot = hourlySnapshot.id
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.subject = subjectToken.subject
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceinMoxie
  snapshot.dailyPriceChange = snapshot.endPrice.minus(snapshot.startPrice) // TODO: confirm

  snapshot.totalSupply = subjectToken.totalSupply

  snapshot.endUniqueHolders = subjectToken.uniqueHolders
  snapshot.dailyUniqueHoldersChange = snapshot.endUniqueHolders.minus(snapshot.startUniqueHolders) // TODO: confirm

  snapshot.endVolume = subjectToken.lifetimeVolume
  snapshot.dailyVolumeChange = snapshot.endVolume.minus(snapshot.startVolume) // TODO: confirm

  snapshot.endSubjectFee = subjectToken.subjectFee
  snapshot.dailySubjectFeeChange = snapshot.endSubjectFee.minus(snapshot.startSubjectFee) // TODO: confirm

  snapshot.endProtocolFee = subjectToken.protocolFee
  snapshot.dailyProtocolFeeChange = snapshot.endProtocolFee.minus(snapshot.startProtocolFee) // TODO: confirm
  snapshot.updatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  snapshot.save()

  // deleting existing rolling daily snapshot for subject token
  let oldRollingDailySnapshot = subjectToken.latestRollingDailySnapshot
  if (oldRollingDailySnapshot) {
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

export function getOrCreateSummary(): Summary {
  let summary = Summary.load(SUMMARY_ID)
  if (!summary) {
    summary = new Summary(SUMMARY_ID)
    summary.totalSubjectTokensIssued = BigInt.zero()
    summary.totalReserve = BigInt.zero()
    summary.totalProtocolTokenInvested = new BigDecimal(BigInt.zero())

    summary.protocolBuyFeePct = BigInt.zero()
    summary.protocolSellFeePct = BigInt.zero()
    summary.subjectBuyFeePct = BigInt.zero()
    summary.subjectSellFeePct = BigInt.zero()

    summary.numberOfBuyOrders = BigInt.zero()
    summary.numberOfSellOrders = BigInt.zero()
    summary.numberOfAuctionOrders = BigInt.zero()
    summary.numberOfUsers = BigInt.zero()
    summary.totalBuyVolume = BigInt.zero()
    summary.totalSellVolume = BigInt.zero()
    summary.totalProtocolFee = BigInt.zero()
    summary.totalProtocolFeeFromAuction = BigInt.zero()
    summary.totalSubjectFee = BigInt.zero()
    summary.totalSubjectFeeFromAuction = BigInt.zero()
    summary.save()
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

  let summary = getOrCreateSummary()
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
  let summary = getOrCreateSummary()
  let protocolFee_ = _depositAmount.times(summary.protocolBuyFeePct).div(PCT_BASE)
  let subjectFee_ = _depositAmount.times(summary.subjectBuyFeePct).div(PCT_BASE)
  return new Fees(protocolFee_, subjectFee_)
}

export function calculateSellSideFee(_depositAmount: BigInt): Fees {
  let summary = getOrCreateSummary()
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

export function createSubjectFeeTransfer(event: ethereum.Event, blockInfo: BlockInfo, order: Order, subjectToken: SubjectToken, fee: BigInt): void {
  let subjectFeeTransfer = new SubjectFeeTransfer(getTxEntityId(event))
  subjectFeeTransfer.txHash = event.transaction.hash
  subjectFeeTransfer.blockInfo = blockInfo.id
  subjectFeeTransfer.order = order.id
  subjectFeeTransfer.subjectToken = subjectToken.id
  subjectFeeTransfer.amount = fee
  subjectFeeTransfer.subject = subjectToken.subject!

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

function findClosest(arr: Array<BigInt>, target: BigInt): BigInt {
  let closest = arr[0]
  let minDiff = target.minus(closest)
  if (minDiff.lt(BigInt.zero())) {
    minDiff = minDiff.times(BigInt.fromI32(-1))
  }

  for (let i = arr.length - 1; i >= 0; i--) {
    let diff = target.minus(arr[i])
    if (diff.lt(BigInt.zero())) {
      diff = diff.times(BigInt.fromI32(-1))
    }
    if (diff.lt(minDiff)) {
      closest = arr[i]
      minDiff = diff
    }
  }

  return closest
}
