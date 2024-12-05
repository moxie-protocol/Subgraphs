import { BigInt, TypedMap, } from "@graphprotocol/graph-ts"

export const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
export const SECONDS_IN_DAY = SECONDS_IN_HOUR.times(BigInt.fromI32(24))
export const SECONDS_IN_WEEK = SECONDS_IN_DAY.times(BigInt.fromI32(7))
export const SECONDS_IN_MONTH = SECONDS_IN_DAY.times(BigInt.fromI32(30))
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
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
  "0x6dba346bb05e5644edb25f9b355b6110649178d1",
  true
)
BLACKLISTED_SUBJECT_TOKEN_ADDRESS.set(
  "0x2ef975b67ce9dda4da3b483ca1c97ff5c9e8800c",
  true
)

export const BLACKLISTED_AUCTION = new TypedMap<string, bool>()
BLACKLISTED_AUCTION.set("228", true)
BLACKLISTED_AUCTION.set("1516", true)
BLACKLISTED_AUCTION.set("1949", true)

export const RAINBOW_ROUTER_MAINNET = "0x00000000009726632680fb29d3f7a9734e3010e2"
export const STAKING_MAINNET = "0xcb2513d389354f7ac80f5042bb8948a234a439b2"

export const WHITELISTED_CONTRACTS_MAINNET = new TypedMap<string, bool>()
WHITELISTED_CONTRACTS_MAINNET.set(RAINBOW_ROUTER_MAINNET, true)
WHITELISTED_CONTRACTS_MAINNET.set(STAKING_MAINNET, true)

export const WHITELISTED_CONTRACTS_TESTNET = new TypedMap<string, bool>()

// bytes4(keccak256("TRANSACTION_FEE")); // 0x7c5f6088
// bytes4(keccak256("ORDER_REFERRER_FEE")); // 0xf42119e1
// bytes4(keccak256("PLATFORM_REFERRER_FEE")); // 0x9b340ab2
// bytes4(keccak256("PROTOCOL_FEE")); // 0xaa072a75

export const TRANSACTION_FEE = "TRANSACTION_FEE"
export const ORDER_REFERRER_FEE = "ORDER_REFERRER_FEE"
export const PLATFORM_REFERRER_FEE = "PLATFORM_REFERRER_FEE"
export const PROTOCOL_FEE = "PROTOCOL_FEE"
export const OTHER = "OTHER"

export const TRANSACTION_FEE_SIG = "0x7c5f6088"
export const ORDER_REFERRER_FEE_SIG = "0xf42119e1"
export const PLATFORM_REFERRER_FEE_SIG = "0x9b340ab2"
export const PROTOCOL_FEE_SIG = "0xaa072a75"


export const V2_UPGRADE_BLOCK_NUMBER = BigInt.fromI32(23269162) // TODO: update this for deployments