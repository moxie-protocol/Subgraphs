import {
  Sync,
  Transfer
} from "../generated/UniswapV2Pair/UniswapV2Pair"
import {
  Sync as Sync2,
  Transfer as Transfer2
} from "../generated/AerodromePair/AerodromePair"
import {
  Deposit,
  Withdraw
} from "../generated/AerodromeGauge/AerodromeGauge"
import { getOrCreateBlockInfo, getOrCreatePoolEntity, getOrCreateUserEntity, getOrCreateUserPoolEntity, handleSyncEvents, handleTransferEvents } from "./utils"
import { GAUGE_LP_TOKEN_MAP } from "./constants"
import { log } from "@graphprotocol/graph-ts"

export function handleSync(event: Sync): void {
  handleSyncEvents(event, event.params.reserve0, event.params.reserve1)
}

export function handleSync2(event: Sync2): void {
  handleSyncEvents(event, event.params.reserve0, event.params.reserve1)
}

//Handling transfers of LP Token. We need to track pool totalSupply and balance of each user
export function handleTransfer(event: Transfer): void {
  handleTransferEvents(event, event.params.from, event.params.to, event.params.value)
}

export function handleTransfer2(event: Transfer2): void {
  handleTransferEvents(event, event.params.from, event.params.to, event.params.value)
}

//When the Aerodrome Gauge Contract is invoked when LP Tokens are deposited we need to track it
export function handleDeposit(event: Deposit): void {
  //First Get the Pool from the gauge contract
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let poolAddress = poolId.toString()
    let pool = getOrCreatePoolEntity(event, poolAddress)
    //Second get the user from the to address
    let user = getOrCreateUserEntity(event, event.params.to.toHexString())
    //Third fetch and update staking balance of the userpool with amount
    let userPool = getOrCreateUserPoolEntity(event, user.id, pool.id)
    userPool.stakedLPAmount = userPool.stakedLPAmount.plus(event.params.amount)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}

//When the Aerodrome Gauge Contract is invoked when LP Tokens are withdrawn we need to track it
export function handleWithdraw(event: Withdraw): void {
  //First Get the Pool from the gauge contract
  let poolId = GAUGE_LP_TOKEN_MAP.mustGet(event.address.toHexString())
  if (poolId != null) {
    let poolAddress = poolId.toString()
    let pool = getOrCreatePoolEntity(event, poolAddress)
    //Second get the user from the from address
    let user = getOrCreateUserEntity(event, event.params.from.toHexString())
    //Third fetch and update staking balance of the userpool with amount
    let userPool = getOrCreateUserPoolEntity(event, user.id, pool.id)
    userPool.stakedLPAmount = userPool.stakedLPAmount.minus(event.params.amount)
    userPool.latestStakeTransactionHash = event.transaction.hash
    userPool.updatedAt = getOrCreateBlockInfo(event).id
    userPool.save()
  }
}