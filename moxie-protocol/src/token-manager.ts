import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { SubjectTokenContract } from "../generated/templates"

import { handleTokenDeployedTx } from "./token-manager-tx"
import { getOrCreateSubjectToken, getOrCreateUser, saveSubjectToken } from "./utils"

// emitted when a new SubjectErc20 is deployed
export function handleTokenDeployed(event: TokenDeployed): void {
  handleTokenDeployedTx(event)
  let token = event.params._token
  let subjectToken = getOrCreateSubjectToken(token, event.block)
  subjectToken.beneficiary = getOrCreateUser(event.params._beneficiary, event.block).id
  saveSubjectToken(subjectToken, event.block)
  SubjectTokenContract.create(token)
}