import { TokenDeployed } from "../generated/TokenManager/TokenManager"
import { SubjectToSubjectToken } from "../generated/schema"
import { SubjectTokenContract } from "../generated/templates"

import { getOrCreateSubjectToken, getOrCreateUser, isBlacklistedSubjectTokenAddress, saveSubjectToken } from "./utils"

// emitted when a new SubjectErc20 is deployed
export function handleTokenDeployed(event: TokenDeployed): void {
  let token = event.params._token
  if (isBlacklistedSubjectTokenAddress(token)) {
    return
  }
  let subjectToken = getOrCreateSubjectToken(token, event.block)
  let user = getOrCreateUser(event.params._beneficiary, event.block)
  subjectToken.subject = user.id
  saveSubjectToken(subjectToken, event.block)
  // create subject to subject token contract
  let subjectToSubjectToken = new SubjectToSubjectToken(event.params._beneficiary.toHexString())
  subjectToSubjectToken.subjectToken = subjectToken.id
  subjectToSubjectToken.save()
  
  SubjectTokenContract.create(token)
}
