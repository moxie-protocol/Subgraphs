import { Address, BigInt, log, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubjectToken, isBlacklistedSubjectTokenAddress, savePortfolio, saveSubjectToken } from "./utils"

export function handleTransfer(event: Transfer): void {
  log.warning("Transfer event: {}", [event.transaction.hash.toHexString()])
  let contractAddress = event.address
  if (isBlacklistedSubjectTokenAddress(contractAddress)) {
    return
  }
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubjectToken(contractAddress, event.block)
  let totalSupply = subjectToken.totalSupply
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
  subjectToken.totalSupply = totalSupply
  saveSubjectToken(subjectToken, event.block)
  // updating portfolios
  if (!mint) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    fromAddressPortfolio.unstakedBalance = fromAddressPortfolio.unstakedBalance.minus(value)
    savePortfolio(fromAddressPortfolio, event.block, true)
  }
  if (!burn) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    toAddressPortfolio.unstakedBalance = toAddressPortfolio.unstakedBalance.plus(value)
    savePortfolio(toAddressPortfolio, event.block, true)
  }
}
