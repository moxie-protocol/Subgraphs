import { BigInt } from "@graphprotocol/graph-ts"

export const SUMMARY_ID = "SUMMARY"

export const PCT_BASE = BigInt.fromI32(10).pow(18)

export const BLACKLISTED_SUBJECT_ADDRESS = new Map<string, bool>()
BLACKLISTED_SUBJECT_ADDRESS.set("0x7412b5b7a7498f7b2a663b5c708a98f3092847f8", true)

export const BLACKLISTED_AUCTION = new Map<string, bool>()
BLACKLISTED_AUCTION.set("228", true)
