import { Address, BigInt, log, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubjectToken, isBlacklistedSubjectAddress, savePortfolio, saveSubjectToken } from "./utils"

export function handleTransfer(event: Transfer): void {
  log.warning("Transfer event: {}", [event.transaction.hash.toHexString()])
  let contractAddress = event.address
  if (isBlacklistedSubjectAddress(contractAddress)) {
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

  // updating portfolios
  if (!mint) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash, event.block)
    let updatedBalance = fromAddressPortfolio.balance.minus(value)
    if (updatedBalance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.minus(BigInt.fromI32(1))
      store.remove("Portfolio", fromAddressPortfolio.id)
    } else {
      fromAddressPortfolio.balance = updatedBalance
      savePortfolio(fromAddressPortfolio, event.block)
    }
  }
  if (!burn) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash, event.block)
    // adding unique holders when a new portfolio is created
    if (toAddressPortfolio.balance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.plus(BigInt.fromI32(1))
    }
    toAddressPortfolio.balance = toAddressPortfolio.balance.plus(value)
    savePortfolio(toAddressPortfolio, event.block)
  }
  saveSubjectToken(subjectToken, event.block)
}
