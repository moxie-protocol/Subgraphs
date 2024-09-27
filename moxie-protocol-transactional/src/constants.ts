import { BigInt, TypedMap } from "@graphprotocol/graph-ts"

export const SUMMARY_ID = "SUMMARY"

export const PCT_BASE = BigInt.fromI32(10).pow(18)

export const BLACKLISTED_SUBJECT_TOKEN_ADDRESS = new TypedMap<string, bool>()
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set("0x7412b5b7a7498f7b2a663b5c708a98f3092847f8", true)
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
 "0x6dba346bb05e5644edb25f9b355b6110649178d1",
 true
)

export const BLACKLISTED_AUCTION = new TypedMap<string, bool>()
BLACKLISTED_AUCTION.set("228", true)
