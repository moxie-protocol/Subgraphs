import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateSummary, isBlacklistedSubjectTokenAddress, isFromOrToStakingContract, savePortfolio, saveSubjectToken } from "./utils"
import { AUCTION_ORDER_CLAIMED as CLAIMED } from "./constants"

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
    summary.totalSubjectTokensIssued = summary.totalSubjectTokensIssued.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
    summary.totalSubjectTokensIssued = summary.totalSubjectTokensIssued.minus(value)
  }
  summary.save()
  subjectToken.totalSupply = totalSupply

  // updating portfolios
  if (!mint && !isFromOrToStakingContract(from, to)) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    fromAddressPortfolio.unstakedBalance = fromAddressPortfolio.unstakedBalance.minus(value)
    savePortfolio(fromAddressPortfolio, event.block,true)
  }
  if (!burn && !isFromOrToStakingContract(from, to)) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    // adding unique holders when a new portfolio is created
    if (toAddressPortfolio.unstakedBalance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.plus(
        BigInt.fromI32(1)
      )
    }
    toAddressPortfolio.unstakedBalance = toAddressPortfolio.unstakedBalance.plus(value)
    savePortfolio(toAddressPortfolio, event.block,true)
  }
  saveSubjectToken(subjectToken, event.block)
}
