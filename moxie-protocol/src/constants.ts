import { Address, BigInt } from "@graphprotocol/graph-ts"
import { dataSource } from "@graphprotocol/graph-ts"

export const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
export const SECONDS_IN_DAY = SECONDS_IN_HOUR.times(BigInt.fromI32(24))
export const SUMMARY_ID = "SUMMARY"
export const PCT_BASE = BigInt.fromI32(10).pow(18)

export class AuctionOrderStatus {
  NA: string
  PLACED: string
  CLAIMED: string
  CANCELLED: string
  constructor() {
    this.NA = "NA"
    this.PLACED = "PLACED"
    this.CLAIMED = "CLAIMED"
    this.CANCELLED = "CANCELLED"
  }
}

export const AUCTION_ORDER_STATUS = new AuctionOrderStatus()

export class AuctionOrderType {
  SELL: string
  BUY: string
  AUCTION: string
  constructor() {
    this.SELL = "SELL"
    this.BUY = "BUY"
    this.AUCTION = "AUCTION"
  }
}

export const AUCTION_ORDER_TYPE = new AuctionOrderType()
