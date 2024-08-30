import { BigInt, TypedMap } from "@graphprotocol/graph-ts"

export const SUMMARY_ID = "SUMMARY"

export const PCT_BASE = BigInt.fromI32(10).pow(18)

export const BLACKLISTED_SUBJECT_TOKEN_ADDRESS = new TypedMap<string, bool>()
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set("0x7412b5b7a7498f7b2a663b5c708a98f3092847f8", true)

export const BLACKLISTED_AUCTION = new TypedMap<string, bool>()
BLACKLISTED_AUCTION.set("228", true)

export const WHITELISTED_ROUTERS = new TypedMap<string, bool>()
// RainbowRouter
WHITELISTED_ROUTERS.set("0x00000000009726632680fb29d3f7a9734e3010e2", true)
