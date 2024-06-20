import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { TokenManagerTokenDeployedTx } from "../generated/schema"

export function handleTokenDeployedTx(event: TokenDeployed): void {
  let tokenManagerTokenDeployedTx = new TokenManagerTokenDeployedTx(
    event.transaction.hash.toHexString()
  )
  tokenManagerTokenDeployedTx.beneficiary = event.params._beneficiary
  tokenManagerTokenDeployedTx.token = event.params._token
  tokenManagerTokenDeployedTx.initialSupply = event.params._initialSupply
  tokenManagerTokenDeployedTx.save()
}
