import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreatePortfolio, getOrCreateSubject, loadSummary, saveSubject } from "./utils"
import { handleTransferTx } from "./subject-token-tx"
import { User } from "../generated/schema"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
  let contractAddress = event.address
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubject(contractAddress)
  let totalSupply = subjectToken.totalSupply
  let summary = loadSummary()
  let mint = from == Address.zero()
  if (mint) {
    // minting
    totalSupply = totalSupply.plus(value)
    summary.totalTokensIssued = summary.totalTokensIssued.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
    summary.totalTokensIssued = summary.totalTokensIssued.minus(value)
  }
  summary.save()
  subjectToken.totalSupply = totalSupply
  // updating holders
  let toAddressString = to.toHexString()
  if (!burn) {
    let uniqueHoldersCount = BigInt.fromI32(0)
    let holders = subjectToken.holders
    // checking if to address is already in holders list
    if (!holders.includes(toAddressString)) {
      holders.push(toAddressString)
      for (let i = 0; i < holders.length; i++) {
        let user = User.load(holders[i])
        if (user) {
          uniqueHoldersCount = uniqueHoldersCount.plus(BigInt.fromI32(1))
        }
      }
      subjectToken.holders = holders
      subjectToken.uniqueHolders = uniqueHoldersCount
    }
  }
  saveSubject(subjectToken, event.block.timestamp)
  // updating portfolios
  if (!mint) {
    let fromAddressPortfolio = getOrCreatePortfolio(from, contractAddress, event.transaction.hash)
    if (fromAddressPortfolio.initTxHash != event.transaction.hash) {
      fromAddressPortfolio.balance = fromAddressPortfolio.balance.minus(value)
      fromAddressPortfolio.save()
    }
  }
  if (!burn) {
    let toAddressPortfolio = getOrCreatePortfolio(to, contractAddress, event.transaction.hash)
    if (toAddressPortfolio.initTxHash != event.transaction.hash) {
      toAddressPortfolio.balance = toAddressPortfolio.balance.plus(value)
      toAddressPortfolio.save()
    }
  }
}
