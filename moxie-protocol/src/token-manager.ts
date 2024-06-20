import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { SubjectTokenContract } from "../generated/templates"

import { handleTokenDeployedTx } from "./token-manager-tx"
import { getOrCreateSubject, getOrCreateUser } from "./utils"

// emitted when a new SubjectErc20 is deployed
export function handleTokenDeployed(event: TokenDeployed): void {
  handleTokenDeployedTx(event)
  let token = event.params._token
  let subjectToken = getOrCreateSubject(token)
  subjectToken.beneficiary = getOrCreateUser(event.params._beneficiary).id
  subjectToken.save()

  SubjectTokenContract.create(token)
}
