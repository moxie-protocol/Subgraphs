import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { getOrCreateSubject } from "./utils"
import { handleTransferTx } from "./subject-token-tx"

export function handleTransfer(event: Transfer): void {
  handleTransferTx(event)
  let contractAddress = event.address
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  let subectToken = getOrCreateSubject(contractAddress)
  let totalSupply = subectToken.totalSupply
  if (from == Address.zero()) {
    // minting
    totalSupply = totalSupply.plus(value)
  }
  let burn = to == Address.zero()
  if (burn) {
    // burning
    totalSupply = totalSupply.minus(value)
  }
  subectToken.totalSupply = totalSupply
  // updating holders
  let toAddressString = to.toHexString()
  if (!burn) {
    let holders = subectToken.holders
    // checking if to address is already in holders list
    let holder = holders.indexOf(toAddressString)
    if (holder == -1) {
      holders.push(toAddressString)
      subectToken.holders = holders
      subectToken.uniqueHolders = BigInt.fromI32(holders.length)
    }
  }
  subectToken.save()
}
