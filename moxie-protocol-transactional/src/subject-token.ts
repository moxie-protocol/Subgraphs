import { Address, BigDecimal, BigInt, log, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { BeneficiaryType, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateSummary, getOrCreateUser, getUserType, isBlacklistedSubjectTokenAddress, savePortfolio, saveSubjectToken, saveUser } from "./utils"

export function handleTransfer(event: Transfer): void {
  let contractAddress = event.address
  if (isBlacklistedSubjectTokenAddress(contractAddress)) {
    return
  }
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubjectToken(contractAddress, event.block)
  let totalSupply = subjectToken.totalSupply
  let summary = getOrCreateSummary()
  let mint = from == Address.zero()
  if (mint) {
    // minting
    totalSupply = totalSupply.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
  }
  summary.save()
  subjectToken.totalSupply = totalSupply
  saveSubjectToken(subjectToken, event.block)

  // updating portfolios
  let protcolTokenInvestedDiff = BigDecimal.zero()
  // for mint `from` address is zero, no need to update `from` portfolio
  if (!mint) {
    let fromPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    let fromOldProtocolTokenInvested = fromPortfolio.protocolTokenInvested
    if (fromPortfolio.balance.gt(BigInt.zero())) {
      protcolTokenInvestedDiff = fromOldProtocolTokenInvested.times(new BigDecimal(value)).div(new BigDecimal(fromPortfolio.balance))
    }
    if (
      getUserType(to) != BeneficiaryType.STAKING &&
      getUserType(from) != BeneficiaryType.STAKING
    ) {
      // if both from and to are not staking, then we need to update the protocol token invested
      fromPortfolio.protocolTokenInvested = fromOldProtocolTokenInvested.minus(
        protcolTokenInvestedDiff
      )
    }
    fromPortfolio.unstakedBalance = fromPortfolio.unstakedBalance.minus(value)
    savePortfolio(fromPortfolio, event.block, true)

    let fromUser = getOrCreateUser(from, event.block)
    fromUser.protocolTokenInvested = fromUser.protocolTokenInvested.minus(protcolTokenInvestedDiff)
    saveUser(fromUser, event.block)
  }
  // for burn `to` address is zero, no need to update `to` portfolio
  if (!burn) {
    let toPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    toPortfolio.unstakedBalance = toPortfolio.unstakedBalance.plus(value)
    if (
      getUserType(to) != BeneficiaryType.STAKING &&
      getUserType(from) != BeneficiaryType.STAKING
    ) {
      // if both from and to are not staking, then we need to update the protocol token invested
      toPortfolio.protocolTokenInvested =
        toPortfolio.protocolTokenInvested.plus(protcolTokenInvestedDiff)
    }
    savePortfolio(toPortfolio, event.block, true)

    let toUser = getOrCreateUser(to, event.block)
    toUser.protocolTokenInvested = toUser.protocolTokenInvested.plus(protcolTokenInvestedDiff)
    saveUser(toUser, event.block)
  }
}
