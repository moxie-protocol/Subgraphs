import { TypedMap } from "@graphprotocol/graph-ts"

//Maps the gauge contract to the corresponding token
export const GAUGE_LP_TOKEN_MAP = new TypedMap<string, string>()
GAUGE_LP_TOKEN_MAP.set("0xea2c1c05c17eed888d0027f17ee23637dff66feb", "0xc02dc3a9b6ead739c56cdea716d8fec4ffe4c799")
