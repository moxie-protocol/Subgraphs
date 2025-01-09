import { TypedMap } from "@graphprotocol/graph-ts"

//Maps the gauge contract to the corresponding token
export const GAUGE_LP_TOKEN_MAP = new TypedMap<string, string>()
// Gauge -> Pool
GAUGE_LP_TOKEN_MAP.set("0xea2c1c05c17eed888d0027f17ee23637dff66feb", "0xc02dc3a9b6ead739c56cdea716d8fec4ffe4c799")
GAUGE_LP_TOKEN_MAP.set("0xe6813b3271803dc1c083ec5e605d68926757ca92", "0x8a86610952343beff5f1a906fd5bd9185c031a90")


export const AerodromeCLGaugeAddress = "0xe6813b3271803dc1c083ec5e605d68926757ca92"

export const NFT_MANAGER_POOL_MAP = new TypedMap<string, string>()
// NFTManager -> Pool
NFT_MANAGER_POOL_MAP.set("0x827922686190790b37229fd06084350e74485b72", "0x8a86610952343beff5f1a906fd5bd9185c031a90")