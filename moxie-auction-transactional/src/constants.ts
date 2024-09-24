import { TypedMap } from "@graphprotocol/graph-ts"

export const ORDER_STATUS_PLACED = "Placed"
export const ORDER_STATUS_CLAIMED = "Claimed"
export const ORDER_STATUS_CANCELLED = "Cancelled"
export const ORDER_ENTITY_COUNTER_ID = "ORDER_ENTITY_COUNTER_ID"

export const BLACKLISTED_SUBJECT_TOKEN_ADDRESS = new TypedMap<string, bool>()
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
  "0x7412b5b7a7498f7b2a663b5c708a98f3092847f8",
  true
)
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
  "0x6dba346bb05e5644edb25f9b355b6110649178d1",
  true
)

export const BLACKLISTED_AUCTION = new TypedMap<string, bool>()
BLACKLISTED_AUCTION.set("228", true)
BLACKLISTED_AUCTION.set("1516", true)
