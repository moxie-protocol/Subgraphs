import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { TokenManagerTokenDeployedTx } from "../generated/schema"
import { getOrCreateBlockInfo, getOrCreateTransactionId, getTxEntityId } from "./utils"

export function handleTokenDeployedTx(event: TokenDeployed): void {
  let tokenManagerTokenDeployedTx = new TokenManagerTokenDeployedTx(getTxEntityId(event))
  tokenManagerTokenDeployedTx.blockInfo = getOrCreateBlockInfo(event.block).id
  tokenManagerTokenDeployedTx.txHash = event.transaction.hash
  tokenManagerTokenDeployedTx.beneficiary = event.params._beneficiary
  tokenManagerTokenDeployedTx.token = event.params._token
  tokenManagerTokenDeployedTx.initialSupply = event.params._initialSupply
  tokenManagerTokenDeployedTx.txn = getOrCreateTransactionId(event.transaction.hash)
  tokenManagerTokenDeployedTx.save()
}
