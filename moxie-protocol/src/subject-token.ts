import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreateSubject, saveSubject } from "./utils"
import { handleTransferTx } from "./subject-token-tx"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
  let contractAddress = event.address
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subjectToken = getOrCreateSubject(contractAddress)
  let totalSupply = subjectToken.totalSupply
  if (from == Address.zero()) {
    // minting
    totalSupply = totalSupply.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
  }
  subjectToken.totalSupply = totalSupply
  // updating holders
  let toAddressString = to.toHexString()
  if (!burn) {
    let holders = subjectToken.holders
    // checking if to address is already in holders list
    let holder = holders.indexOf(toAddressString)
    if (holder == -1) {
      holders.push(toAddressString)
      subjectToken.holders = holders
      subjectToken.uniqueHolders = BigInt.fromI32(holders.length)
    }
  }
  saveSubject(subjectToken, event.block.timestamp)
}
