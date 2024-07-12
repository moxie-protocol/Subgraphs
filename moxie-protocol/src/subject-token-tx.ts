import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { SubjectTokenTransferTx } from "../generated/schema"
import { getOrCreateAuctionTransferId, getOrCreateBlockInfo, getTxEntityId } from "./utils"

export function handleTransferTx(event: Transfer): void {
  let subjectTokenTransferTx = new SubjectTokenTransferTx(getTxEntityId(event))
  subjectTokenTransferTx.blockInfo = getOrCreateBlockInfo(event).id
  subjectTokenTransferTx.txHash = getOrCreateAuctionTransferId(event.transaction.hash)
  subjectTokenTransferTx.from = event.params.from
  subjectTokenTransferTx.to = event.params.to
  subjectTokenTransferTx.value = event.params.value
  subjectTokenTransferTx.contractAddress = event.address
  subjectTokenTransferTx.save()
}
