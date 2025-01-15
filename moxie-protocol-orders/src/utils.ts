import { Address, BigDecimal, BigInt, Bytes, ethereum, log, store, ByteArray, dataSource } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { BlockInfo, Order, Portfolio, ProtocolFeeBeneficiary, SubjectToken, Summary, User, Auction, } from "../generated/schema"
import { BLACKLISTED_AUCTION, BLACKLISTED_SUBJECT_TOKEN_ADDRESS, ONBOARDING_STATUS_ONBOARDING_INITIALIZED, PCT_BASE, SECONDS_IN_DAY, SECONDS_IN_HOUR, SUMMARY_ID, TOKEN_DECIMALS, WHITELISTED_CONTRACTS_MAINNET, WHITELISTED_CONTRACTS_TESTNET } from "./constants"
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
    subjectToken.marketCap = BigDecimal.zero()
    subjectToken.totalSupply = BigInt.zero()
    subjectToken.initialSupply = BigInt.zero()
    subjectToken.uniqueHolders = BigInt.zero()
    subjectToken.lifetimeVolume = BigInt.zero()
    subjectToken.subjectFee = BigInt.zero()
    subjectToken.protocolFee = BigInt.zero()
    subjectToken.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    subjectToken.createdAtBlockNumber = block.number
    subjectToken.buySideVolume = BigInt.zero()
    subjectToken.lastOrderBlockNumber = BigInt.zero()
    subjectToken.sellSideVolume = BigInt.zero()
    subjectToken.protocolTokenInvested = BigDecimal.zero()
    subjectToken.status = ONBOARDING_STATUS_ONBOARDING_INITIALIZED
    subjectToken.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
    subjectToken.updatedAtBlockNumber = block.number
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
    // new holder
    subjectToken.uniqueHolders = subjectToken.uniqueHolders.plus(
      BigInt.fromI32(1)
    )
    saveSubjectToken(subjectToken, block)
    portfolio.user = user.id
    portfolio.subjectToken = subjectToken.id
    portfolio.balance = BigInt.zero()
    portfolio.buyVolume = BigInt.zero()
    portfolio.sellVolume = BigInt.zero()
    // portfolio.stakedBalance = BigInt.zero()
    // portfolio.unstakedBalance = BigInt.zero()
    portfolio.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    portfolio.createdAtBlockNumber = block.number
    portfolio.subjectTokenBuyVolume = BigInt.zero()
    portfolio.protocolTokenInvested = BigDecimal.zero()
    savePortfolio(portfolio, block)
  }
  return portfolio
}

/**
 * Saves portfolio entity and updates the subject token unique holders count
 * @param portfolio Portfolio entity which needs to be saved
 * @param block ethereum.Block
 * @param deleteZeroBalancePortfolio boolean flag to check balance and delete portfolio if balance is zero
 * @returns 
 */
export function savePortfolio(portfolio: Portfolio, block: ethereum.Block, deleteZeroBalancePortfolio: bool = false): void {
  portfolio.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  portfolio.updatedAtBlockNumber = block.number
  // portfolio.balance = portfolio.unstakedBalance.plus(portfolio.stakedBalance)
  if (deleteZeroBalancePortfolio && portfolio.balance.equals(BigInt.zero())) {
    let subjectToken = SubjectToken.load(portfolio.subjectToken)!
    subjectToken.uniqueHolders = subjectToken.uniqueHolders.minus(
      BigInt.fromI32(1)
    )
    saveSubjectToken(subjectToken, block)
    // delete portfolio if balance gets zero
    store.remove("Portfolio", portfolio.id)
    return
  }
  portfolio.save()
}

export function getOrCreateUser(userAddress: Address, block: ethereum.Block): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.buyVolume = BigInt.zero()
    user.sellVolume = BigInt.zero()
    user.protocolOrdersCount = BigInt.zero()
    user.createdAtBlockInfo = getOrCreateBlockInfo(block).id
    user.createdAtBlockNumber = block.number
    user.protocolTokenInvested = BigDecimal.zero()
    saveUser(user, block)
    let summary = getOrCreateSummary()
    summary.numberOfUsers = summary.numberOfUsers.plus(BigInt.fromI32(1))
    summary.save()
  }
  return user
}
export function saveUser(user: User, block: ethereum.Block): void {
  user.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  user.updatedAtBlockNumber = block.number
  user.save()
}



function getSnapshotId(subjectToken: SubjectToken, timestamp: BigInt): string {
  return subjectToken.id.concat("-").concat(timestamp.toString())
}





export function saveSubjectToken(subjectToken: SubjectToken, block: ethereum.Block): void {
  subjectToken.lastUpdatedAtBlockInfo = subjectToken.updatedAtBlockInfo
  subjectToken.updatedAtBlockInfo = getOrCreateBlockInfo(block).id
  subjectToken.updatedAtBlockNumber = block.number
  subjectToken.marketCap = subjectToken.currentPriceInMoxie.times(subjectToken.totalSupply.toBigDecimal()).div(BigInt.fromI32(10).pow(18).toBigDecimal())
  subjectToken.save()

}

export function getOrCreateSummary(): Summary {
  let summary = Summary.load(SUMMARY_ID)
  if (!summary) {
    summary = new Summary(SUMMARY_ID)
    summary.totalSubjectTokensIssued = BigInt.zero()
    summary.totalReserve = BigInt.zero()
    summary.totalProtocolTokenInvested = BigDecimal.zero()
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


export function chooseUser(from: Address, beneficiary: Address): Address {
  if (dataSource.network() == "base") {
    if (WHITELISTED_CONTRACTS_MAINNET.isSet(beneficiary.toHexString().toLowerCase())) {
      return from
    }
    return beneficiary
  }

  if (WHITELISTED_CONTRACTS_TESTNET.isSet(beneficiary.toHexString().toLowerCase())) {
    return from
  }
  return beneficiary
}