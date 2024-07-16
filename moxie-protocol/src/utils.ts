import { Address, BigDecimal, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { Transaction, BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, ProtocolFeeTransfer, SubjectToken, SubjectDailySnapshot, SubjectFeeTransfer, SubjectHourlySnapshot, Summary, User, UserProtocolOrder } from "../generated/schema"
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
    subjectToken.uniqueHolders = BigInt.zero()
    subjectToken.volume = BigInt.zero()
    subjectToken.beneficiaryFee = BigInt.zero()
    subjectToken.protocolFee = BigInt.zero()
    subjectToken.holders = []
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
  let snapshotId = subjectToken.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectHourlySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectHourlySnapshot(snapshotId)
    snapshot.startPrice = subjectToken.currentPriceinMoxie
    snapshot.startUniqueHolders = subjectToken.uniqueHolders
    snapshot.startVolume = subjectToken.volume
    snapshot.startBeneficiaryFee = subjectToken.beneficiaryFee
    snapshot.startProtocolFee = subjectToken.protocolFee
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
  snapshot.save()
}

function createSubjectTokenDailySnapshot(subjectToken: SubjectToken, timestamp: BigInt): void {
  let snapshotTimestamp = timestamp.minus(timestamp.mod(SECONDS_IN_DAY)).plus(SECONDS_IN_DAY)
  let snapshotId = subjectToken.id.concat("-").concat(snapshotTimestamp.toString())
  let snapshot = SubjectDailySnapshot.load(snapshotId)
  if (!snapshot) {
    snapshot = new SubjectDailySnapshot(snapshotId)
    snapshot.startPrice = subjectToken.currentPriceinMoxie
    snapshot.startUniqueHolders = subjectToken.uniqueHolders
    snapshot.startVolume = subjectToken.volume
    snapshot.startBeneficiaryFee = subjectToken.beneficiaryFee
    snapshot.startProtocolFee = subjectToken.protocolFee
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
  snapshot.save()
}

export function saveSubjectToken(subject: SubjectToken, block: ethereum.Block): void {
  subject.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  subject.save()
  createSubjectTokenDailySnapshot(subject, block.timestamp)
  createSubjectTokenHourlySnapshot(subject, block.timestamp)
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