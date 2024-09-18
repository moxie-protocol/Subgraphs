import { Address, BigDecimal, BigInt, Bytes, ethereum, log, store, ByteArray } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectToken, SubjectTokenDailySnapshot, SubjectFeeTransfer, SubjectTokenHourlySnapshot, Summary, User, SubjectTokenRollingDailySnapshot, Auction, } from "../generated/schema"
import { BLACKLISTED_AUCTION, BLACKLISTED_SUBJECT_TOKEN_ADDRESS, ONBOARDING_STATUS_ONBOARDING_INITIALIZED, PCT_BASE, SECONDS_IN_DAY, SECONDS_IN_HOUR, STAKING_CONTRACT_ADDRESS, SUMMARY_ID, TOKEN_DECIMALS } from "./constants"

export function getOrCreateSubjectToken(subjectTokenAddress: Address, block: ethereum.Block): SubjectToken {
  let subjectToken = SubjectToken.load(subjectTokenAddress.toHexString())
  if (!subjectToken) {
    subjectToken = new SubjectToken(subjectTokenAddress.toHexString())
    let token = ERC20.bind(subjectTokenAddress)
    subjectToken.name = token.name()
    subjectToken.symbol = token.symbol()
    subjectToken.decimals = TOKEN_DECIMALS
    // setting default values for now
    subjectToken.totalStaked = BigInt.zero()
    subjectToken.reserve = BigInt.zero()
    subjectToken.reserveRatio = BigInt.zero()
    subjectToken.currentPriceInMoxie = BigDecimal.zero()
    subjectToken.currentPriceInWeiInMoxie = BigDecimal.zero()
    subjectToken.totalSupply = BigInt.zero()
    subjectToken.initialSupply = BigInt.zero()
    subjectToken.uniqueHolders = BigInt.zero()
    subjectToken.lifetimeVolume = BigInt.zero()
    subjectToken.subjectFee = BigInt.zero()
    subjectToken.protocolFee = BigInt.zero()
    subjectToken.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    subjectToken.buySideVolume = BigInt.zero()
    subjectToken.sellSideVolume = BigInt.zero()
    subjectToken.protocolTokenInvested = BigDecimal.zero()
    subjectToken.status = ONBOARDING_STATUS_ONBOARDING_INITIALIZED
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
    let subjectToken = getOrCreateSubjectToken(subjectAddress, block)
    portfolio.user = user.id
    portfolio.subjectToken = subjectToken.id
    portfolio.balance = BigInt.zero()
    portfolio.buyVolume = BigInt.zero()
    portfolio.sellVolume = BigInt.zero()
    portfolio.stakedBalance = BigInt.zero()
    portfolio.unstakedBalance = BigInt.zero()
    portfolio.protocolTokenInvested = BigDecimal.zero()
    portfolio.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    portfolio.subjectTokenBuyVolume = BigInt.zero()
    savePortfolio(portfolio, block)
  }
  return portfolio
}

export function savePortfolio(portfolio: Portfolio, block: ethereum.Block): void {
  portfolio.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  portfolio.balance = portfolio.unstakedBalance.plus(portfolio.stakedBalance)
  if (portfolio.balance.equals(BigInt.zero())) {
    store.remove("Portfolio", portfolio.id)
    return
  }
  portfolio.save()
}

export function getOrCreateUser(userAddress: Address, block: ethereum.Block): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.subjectFeeTransfer = []
    user.buyVolume = BigInt.zero()
    user.sellVolume = BigInt.zero()
    user.protocolTokenInvested = BigDecimal.zero()
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

/**
 * Creates a new hourly snapshot for the subject token and returns the timestamp of the snapshot
 */
function createSubjectTokenHourlySnapshot(subjectToken: SubjectToken, timestamp: BigInt): BigInt {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_HOUR)).plus(SECONDS_IN_HOUR)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenHourlySnapshot(snapshotId)
    snapshot.startTimestamp = timestamp
    snapshot.startPrice = subjectToken.currentPriceInMoxie
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
  snapshot.endPrice = subjectToken.currentPriceInMoxie
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

  return snapshotTimestamp
}

function getSnapshotId(subjectToken: SubjectToken, timestamp: BigInt): string {
  return subjectToken.id.concat("-").concat(timestamp.toString())
}

/**
 * This function tries to load hourly snapshot from previous daily snapshot
 * @param subjectToken
 * @param timestamp
 * @param latestSnapshotId
 * @returns
 */
function loadClosestSubjectTokenHourlySnapshotInPreviousDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt): SubjectTokenHourlySnapshot {
  if (!subjectToken.previousDailySnapshot) {
    throw new Error("Previous daily snapshot not found for subject token: " + subjectToken.id + " and timestamp: " + timestamp.toString())
  }
  let previousDailySnapshot = SubjectTokenDailySnapshot.load(subjectToken.previousDailySnapshot!)
  if (!previousDailySnapshot) {
    throw new Error("Previous daily snapshot not loading for subject token: " + subjectToken.id + " and timestamp: " + timestamp.toString())
  }
  let snapshotTimestamp = BigInt.zero()
  if (isEveryElementGreaterThanTarget(previousDailySnapshot.hourlySnapshotEndTimestamps, timestamp) && previousDailySnapshot.lastSubjectTokenDailySnapshot) {
    // means the timestamp is before the first hourly snapshot in the daily snapshot
    // and there is a previous daily snapshot
    let dayBeforeDailySnapshot = SubjectTokenDailySnapshot.load(previousDailySnapshot.lastSubjectTokenDailySnapshot!)
    if (!dayBeforeDailySnapshot) {
      throw new Error("Previous daily snapshot not loading for subject token: " + subjectToken.id + " and timestamp: " + timestamp.toString())
    }
    snapshotTimestamp = dayBeforeDailySnapshot.hourlySnapshotEndTimestamps[dayBeforeDailySnapshot.hourlySnapshotEndTimestamps.length - 1]
    log.warning("previousDailySnapshot.lastSubjectTokenDailySnapshot {} timestamp {} snapshotTimestamp {}", [previousDailySnapshot.lastSubjectTokenDailySnapshot!, timestamp.toString(), snapshotTimestamp.toString()])
  } else {
    // means the timestamp is after the first hourly snapshot in the daily snapshot
    // or there is no previous daily snapshot before it
    snapshotTimestamp = findClosest(previousDailySnapshot.hourlySnapshotEndTimestamps, timestamp)
  }
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    throw new Error("Snapshot not found for subject token: " + subjectToken.id + " and timestamp: " + timestamp.toString())
  }
  return snapshot
}

function createSubjectTokenDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt, lastHourlySnapshotEndTimestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_DAY)).plus(SECONDS_IN_DAY)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenDailySnapshot.load(snapshotId)
  let justCreated = false
  if (!snapshot) {
    snapshot = new SubjectTokenDailySnapshot(snapshotId)
    snapshot.startTimestamp = timestamp
    snapshot.startPrice = subjectToken.currentPriceInMoxie
    snapshot.startUniqueHolders = subjectToken.uniqueHolders
    snapshot.startVolume = subjectToken.lifetimeVolume
    snapshot.startSubjectFee = subjectToken.subjectFee
    snapshot.startProtocolFee = subjectToken.protocolFee
    snapshot.createdAtBlockInfo = subjectToken.createdAtBlockInfo
    snapshot.hourlySnapshotEndTimestamps = []
    justCreated = true
  }
  snapshot.endTimestamp = snapshotTimestamp

  snapshot.subjectToken = subjectToken.id

  snapshot.subject = subjectToken.subject
  snapshot.reserve = subjectToken.reserve
  snapshot.endPrice = subjectToken.currentPriceInMoxie
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

  let hourlySnapshotEndTimestamps = snapshot.hourlySnapshotEndTimestamps
  if (!hourlySnapshotEndTimestamps.includes(lastHourlySnapshotEndTimestamp)) {
    hourlySnapshotEndTimestamps.push(lastHourlySnapshotEndTimestamp)
  }
  snapshot.hourlySnapshotEndTimestamps = hourlySnapshotEndTimestamps
  snapshot.save()

  if (justCreated) {
    // means we are creating a new daily snapshot for the first time
    // subject token needs to be updated with the latest daily snapshot
    if (!subjectToken.previousDailySnapshot) {
      // adding previous daily snapshot for the first time
      subjectToken.previousDailySnapshot = snapshotId
    } else {
      // setting previous daily snapshot to the latest daily from subjectToken, since we are creating a new daily snapshot
      subjectToken.previousDailySnapshot = subjectToken.latestDailySnapshot
      // setting connecting with the previous daily snapshot
      snapshot.lastSubjectTokenDailySnapshot = subjectToken.latestDailySnapshot
      snapshot.save()
    }
    subjectToken.latestDailySnapshot = snapshotId
    subjectToken.save()
  }
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
  let time24HourAgo = timestamp.minus(SECONDS_IN_DAY)
  let snapshotId = getSnapshotId(subjectToken, snapshotTimestamp)
  let snapshot = SubjectTokenRollingDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectTokenRollingDailySnapshot(snapshotId)
    let hourlySnapshot = loadClosestSubjectTokenHourlySnapshotInPreviousDailySnapshot(subjectToken, time24HourAgo)
    snapshot.startTimestamp = time24HourAgo
    snapshot.startReferenceTimestamp = hourlySnapshot.endTimestamp
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
  snapshot.endPrice = subjectToken.currentPriceInMoxie
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
  if (oldRollingDailySnapshot && oldRollingDailySnapshot != snapshotId) {
    store.remove("SubjectTokenRollingDailySnapshot", oldRollingDailySnapshot)
  }
  subjectToken.latestRollingDailySnapshot = snapshotId
  subjectToken.save()
}

export function saveSubjectToken(subject: SubjectToken, block: ethereum.Block, saveSnapshot: boolean = false): void {
  subject.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  subject.save()
  if (saveSnapshot) {
    let lastHourylSnapshotEndTimestamp = createSubjectTokenHourlySnapshot(subject, block.timestamp)
    createSubjectTokenDailySnapshot(subject, block.timestamp, lastHourylSnapshotEndTimestamp)
    createSubjectTokenRollingDailySnapshot(subject, block.timestamp)
  }
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

export function calculateSellSideProtocolAmountAddingBackFees(_buyAmount: BigInt): BigInt {
  let summary = getOrCreateSummary()
  return _calculateSellSideProtocolAmountAddingBackFees(summary.protocolSellFeePct, summary.subjectSellFeePct, _buyAmount)
}

export function _calculateSellSideProtocolAmountAddingBackFees(protocolSellFeePct: BigInt, subjectSellFeePct: BigInt, _buyAmount: BigInt): BigInt {
  let totalFeePCT = protocolSellFeePct.plus(subjectSellFeePct)
  // moxieAmount_ = (estimatedAmount * PCT_BASE) / (PCT_BASE - totalFeePCT);
  return _buyAmount.times(PCT_BASE).div(PCT_BASE.minus(totalFeePCT))
}

export function calculateSellSideFee(_sellAmount: BigInt): Fees {
  let summary = getOrCreateSummary()
  return _calculateSellSideFee(summary.protocolSellFeePct, summary.subjectSellFeePct, _sellAmount)
}
export function _calculateSellSideFee(protocolSellFeePct: BigInt, subjectSellFeePct: BigInt, _sellAmount: BigInt): Fees {
  // protocolFee_ = (_sellAmount * protocolSellFeePct) / PCT_BASE
  // subjectFee_ = (_sellAmount * subjectSellFeePct) / PCT_BASE

  let protocolFee_ = _sellAmount.times(protocolSellFeePct).div(PCT_BASE)
  let subjectFee_ = _sellAmount.times(subjectSellFeePct).div(PCT_BASE)
  return new Fees(protocolFee_, subjectFee_)
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

  order.protocolFeeTransfer = protocolFeeTransfer.id
  order.save()
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

  order.subjectFeeTransfer = subjectFeeTransfer.id
  order.save()
}

export function isEveryElementGreaterThanTarget(arr: Array<BigInt>, target: BigInt): bool {
  if (arr.length == 0) {
    throw new Error("Array is empty")
  }
  let sortedArray = arr.sort() // sorts array in ascending order
  // if smallest element in array greater than target, then every element is greater than target
  return sortedArray[0].gt(target)
}

export function findClosest(arr: Array<BigInt>, target: BigInt): BigInt {
  if (arr.length == 0) {
    throw new Error("Array is empty")
  }
  let closest = arr[0]
  let minDiff = target.minus(closest).abs()
  for (let i = arr.length - 1; i >= 0; i--) {
    let diff = target.minus(arr[i]).abs()
    if (diff.lt(minDiff)) {
      closest = arr[i]
      minDiff = diff
    }
  }

  return closest
}

export class AuctionOrderClass {
  userId: BigInt
  buyAmount: BigInt
  sellAmount: BigInt
  constructor(_userId: BigInt, _buyAmount: BigInt, _sellAmount: BigInt) {
    this.userId = _userId
    this.buyAmount = _buyAmount
    this.sellAmount = _sellAmount
  }
  /**
   * Replicates behavior in contract
   * @param orderRight
   * @returns
   */
  smallerThan(orderRight: AuctionOrderClass): bool {
    if (this.buyAmount.times(orderRight.sellAmount) < orderRight.buyAmount.times(this.sellAmount)) return true
    if (this.buyAmount.times(orderRight.sellAmount) > orderRight.buyAmount.times(this.sellAmount)) return false
    if (this.buyAmount < orderRight.buyAmount) return true
    if (this.buyAmount > orderRight.buyAmount) return false
    if (this.userId < orderRight.userId) return true
    return false
  }
}

export function convertHexStringToBigInt(hexString: string): BigInt {
  let paddedHexString = hexZeroPad(hexString)
  const bytes = ByteArray.fromHexString(paddedHexString).reverse()
  return BigInt.fromByteArray(changetype<ByteArray>(bytes))
}

function hexZeroPad(hexstring: string, length: i32 = 32): string {
  return hexstring.substr(0, 2) + hexstring.substr(2).padStart(length * 2, "0")
}

export function decodeOrder(encodedOrderId: Bytes): AuctionOrderClass {
  let clearingPriceOrder = encodedOrderId.toHexString()
  let userIdHex = "0x" + clearingPriceOrder.substring(2, 18)
  let buyAmountHex = "0x" + clearingPriceOrder.substring(19, 42)
  let sellAmountHex = "0x" + clearingPriceOrder.substring(43, 66)
  let userId = convertHexStringToBigInt(userIdHex)
  let buyAmount = convertHexStringToBigInt(buyAmountHex)
  let sellAmount = convertHexStringToBigInt(sellAmountHex)
  return new AuctionOrderClass(userId, buyAmount, sellAmount)
}
export class CalculatePrice {
  price: BigDecimal
  priceInWei: BigDecimal
  //Price = Reserve/TotalSupply * ReserveRatio
  constructor(reserve: BigInt, totalSupply: BigInt, reserveRatio: BigInt) {
    if (reserveRatio.equals(BigInt.zero())) {
      this.price = BigDecimal.zero()
      this.priceInWei = BigDecimal.zero()
    } else {
      //Converting it from 800000 to 0.8
      let reserveRatioDecimal = reserveRatio.divDecimal(BigInt.fromI32(10).pow(6).toBigDecimal())
      this.price = reserve.divDecimal(totalSupply.toBigDecimal().times(reserveRatioDecimal))
      this.priceInWei = this.price.times(BigInt.fromI32(10).pow(18).toBigDecimal())
    }
  }
}

export function loadAuction(auctionId: BigInt): Auction {
  let auction = Auction.load(auctionId.toString())
  if (!auction) {
    throw new Error("Auction not loaded: auctionId : " + auctionId.toString())
  }
  return auction
}

export function isBlacklistedSubjectTokenAddress(subjectAddress: Address): bool {
  return BLACKLISTED_SUBJECT_TOKEN_ADDRESS.isSet(subjectAddress.toHexString())
}

export function isBlacklistedAuction(auctionId: string): bool {
  return BLACKLISTED_AUCTION.isSet(auctionId)
}


export function isFromOrToStakingContract(from: Address, to: Address): bool {
  return from.toHexString().toLowerCase() == STAKING_CONTRACT_ADDRESS || to.toHexString().toLowerCase() == STAKING_CONTRACT_ADDRESS
}