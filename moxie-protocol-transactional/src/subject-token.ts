import { Address, BigDecimal, BigInt, store } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubjectToken, savePortfolio, saveSubjectToken } from "./utils"

export function handleTransfer(event: Transfer): void {
  let contractAddress = event.address
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
    fromAddressPortfolio.balance = fromAddressPortfolio.balance.minus(value)
    savePortfolio(fromAddressPortfolio, event.block)
    if (fromAddressPortfolio.balance.equals(BigInt.fromI32(0))) {
      subjectToken.uniqueHolders = subjectToken.uniqueHolders.minus(BigInt.fromI32(1))
      store.remove("Portfolio", fromAddressPortfolio.id)
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
