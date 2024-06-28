import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { TokenManagerTokenDeployedTx } from "../generated/schema"
import { getOrCreateBlockInfo, getTxEntityId } from "./utils"

export function handleTokenDeployedTx(event: TokenDeployed): void {
  let tokenManagerTokenDeployedTx = new TokenManagerTokenDeployedTx(getTxEntityId(event))
  tokenManagerTokenDeployedTx.blockInfo = getOrCreateBlockInfo(event).id
  tokenManagerTokenDeployedTx.txHash = event.transaction.hash
  tokenManagerTokenDeployedTx.beneficiary = event.params._beneficiary
  tokenManagerTokenDeployedTx.token = event.params._token
  tokenManagerTokenDeployedTx.initialSupply = event.params._initialSupply
  tokenManagerTokenDeployedTx.blockInfo = getOrCreateBlockInfo(event).id
  tokenManagerTokenDeployedTx.save()
}
