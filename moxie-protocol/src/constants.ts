import { Address, BigInt } from "@graphprotocol/graph-ts"
import { dataSource } from "@graphprotocol/graph-ts"

export const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60)
export const SECONDS_IN_DAY = SECONDS_IN_HOUR.times(BigInt.fromI32(24))
export const SUMMARY_ID = "SUMMARY"

export class InitialProtocolDataPoints {
  beneficiary: Address = Address.zero()
  protocolBuyFeePct: BigInt = BigInt.fromI32(0)
  protocolSellFeePct: BigInt = BigInt.fromI32(0)
  subjectBuyFeePct: BigInt = BigInt.fromI32(0)
  subjectSellFeePct: BigInt = BigInt.fromI32(0)
  constructor() {
    let network = dataSource.network()
    if (network == "base-sepolia") {
      this.beneficiary = initialBaseSepoliaBeneficiaryAddress
      this.protocolBuyFeePct = initialBaseSepoliaProtocolBuyFeePct
      this.protocolSellFeePct = initialBaseSepoliaProtocolSellFeePct
      this.subjectBuyFeePct = initialBaseSepoliaSubjectBuyFeePct
      this.subjectSellFeePct = initialBaseSepoliaSubjectSellFeePct
    } else {
      throw new Error("Unsupported network: " + network)
    }
  }
}

export const initialBaseSepoliaBeneficiaryAddress = Address.fromString("0x648e7e89A70ef654B5754E9EB91BF931a477e3CD")
export const initialBaseSepoliaProtocolBuyFeePct = BigInt.fromString("10000000000000000")
export const initialBaseSepoliaProtocolSellFeePct = BigInt.fromString("20000000000000000")
export const initialBaseSepoliaSubjectBuyFeePct = BigInt.fromString("30000000000000000")
export const initialBaseSepoliaSubjectSellFeePct = BigInt.fromString("40000000000000000")

export const initialProtocolDataPoints = new InitialProtocolDataPoints()

export const PCT_BASE = BigInt.fromI32(10).pow(18)
