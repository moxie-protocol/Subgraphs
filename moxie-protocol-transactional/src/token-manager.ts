import { log } from "@graphprotocol/graph-ts"
import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { SubjectTokenContract } from "../generated/templates"

import { getOrCreateSubjectToken, getOrCreateUser, isBlacklistedSubjectTokenAddress, saveSubjectToken } from "./utils"

// emitted when a new SubjectErc20 is deployed
export function handleTokenDeployed(event: TokenDeployed): void {
  log.warning("Token deployed event emitted: {}", [event.transaction.hash.toHexString()])
  let token = event.params._token
  if (isBlacklistedSubjectTokenAddress(token)) {
    return
  }
  let subjectToken = getOrCreateSubjectToken(token, event.block)
  let user = getOrCreateUser(event.params._beneficiary, event.block)
  subjectToken.subject = user.id
  saveSubjectToken(subjectToken, event.block)
  log.warning("Token deployed: {}", [token.toHexString()])
  SubjectTokenContract.create(token)
}
