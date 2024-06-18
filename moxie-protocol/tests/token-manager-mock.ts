import { TokenDeployed } from "../generated/TokenManager/TokenManager"

import { newMockEvent } from "matchstick-as"
import { TokenDeployedInput } from "./types"
import {
  addressValue,
  getAddressEventParam,
  getBigIntEventParam,
  getBooleanEventParam,
  getBytesEventParam,
  getStringEventParam,
} from "./utils"
import { Address, Bytes } from "@graphprotocol/graph-ts"

export function mockTokenDeployed(input: TokenDeployedInput): TokenDeployed {
  let tokenDeployed = changetype<TokenDeployed>(newMockEvent())
  let beneficiary = getAddressEventParam("_beneficiary", input.beneficiary)
  let token = getAddressEventParam("_token", input.token)
  let initialSupply = getBigIntEventParam("_initialSupply", input.initialSupply)
  tokenDeployed.parameters = [beneficiary, token, initialSupply]
  tokenDeployed.transaction.hash = Bytes.fromHexString(input.hash)
  tokenDeployed.address = Address.fromString(input.contractAddress)
  return tokenDeployed
}
