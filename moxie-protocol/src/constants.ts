import { BigInt, TypedMap } from "@graphprotocol/graph-ts"

export const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
export const SECONDS_IN_DAY = SECONDS_IN_HOUR.times(BigInt.fromI32(24))
export const SUMMARY_ID = "SUMMARY"
export const PCT_BASE = BigInt.fromI32(10).pow(18)

export const AUCTION_ORDER_NA = "NA"
export const AUCTION_ORDER_PLACED = "PLACED"
export const AUCTION_ORDER_CLAIMED = "CLAIMED"
export const AUCTION_ORDER_CANCELLED = "CANCELLED"

export const ORDER_TYPE_SELL = "SELL"
export const ORDER_TYPE_BUY = "BUY"
export const ORDER_TYPE_AUCTION = "AUCTION"

export const ONBOARDING_STATUS_ONBOARDING_INITIALIZED = "OnboardingInitialized"
export const ONBOARDING_STATUS_ONBOARDING_FINISHED = "OnboardingFinished"

export const TOKEN_DECIMALS = BigInt.fromI32(18)

export const BLACKLISTED_SUBJECT_TOKEN_ADDRESS = new TypedMap<string, bool>()
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
  "0x7412b5b7a7498f7b2a663b5c708a98f3092847f8",
  true
)

export const BLACKLISTED_AUCTION = new TypedMap<string, bool>()
BLACKLISTED_AUCTION.set("228", true)

// TODO: change it for production
export const STAKING_CONTRACT_ADDRESS = "0xf55bdc4c6820ce670185ede0f3f4fb3adc972266"
