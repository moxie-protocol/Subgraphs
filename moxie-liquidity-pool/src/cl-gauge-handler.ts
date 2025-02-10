import {
  Deposit,
  Withdraw,
} from "../generated/AerodromeCLGauge/AerodromeCLGauge"
import { Position, UserPool } from "../generated/schema"
import { savePosition, saveUserPool } from "./utils"

export function handleCLDeposit(event: Deposit): void {
  let position = Position.load(event.params.tokenId.toString())
  if (!position) {
    throw new Error(
      "Position not found for tokenId: " + event.params.tokenId.toString() + " txHash: " + event.transaction.hash.toHexString()
    )
  }
  position.unstakedLpAmount = position.unstakedLpAmount.minus(
    event.params.liquidityToStake
  )
  savePosition(event, position)
  let userPool = UserPool.load(position.userPool!)!
  userPool.stakedLPAmount = userPool.stakedLPAmount.plus(
    event.params.liquidityToStake
  )
  userPool.unstakedLpAmount = position.unstakedLpAmount
  saveUserPool(event, userPool, true)
}

export function handleCLWithdraw(event: Withdraw): void {
  let position = Position.load(event.params.tokenId.toString())
  if (!position) {
    throw new Error(
      "Position not found for tokenId: " + event.params.tokenId.toString() + " txHash: " + event.transaction.hash.toHexString()
    )
  }
  position.unstakedLpAmount = position.unstakedLpAmount.plus(
    event.params.liquidityToStake
  )
  savePosition(event, position)
  let userPool = UserPool.load(position.userPool!)!
  userPool.stakedLPAmount = userPool.stakedLPAmount.minus(
    event.params.liquidityToStake
  )
  userPool.unstakedLpAmount = position.unstakedLpAmount
  saveUserPool(event, userPool, true)
}
