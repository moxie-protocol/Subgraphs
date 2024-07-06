import { Transfer } from "../generated/EasyAuction/ERC20Contract"
import { AggregateTransfer, Transfer as TransferEntity } from "../generated/schema"
import { getOrCreateBlockInfo, getTokenDetails, getTxEntityId, isEasyAuction } from "./utils"
export function handleTransfer(event: Transfer): void {
  let transfer = new TransferEntity(getTxEntityId(event))
  let fromIsAuction = isEasyAuction(event.params.from)
  let toIsAuction = isEasyAuction(event.params.to)
  if (fromIsAuction || toIsAuction) {
    let aggregate = AggregateTransfer.load(event.transaction.hash.toHexString())
    if (aggregate == null) {
      aggregate = new AggregateTransfer(event.transaction.hash.toHexString())
    }
    aggregate.save()
    transfer.from = event.params.from
    transfer.to = event.params.to
    transfer.value = event.params.value
    transfer.blockInfo = getOrCreateBlockInfo(event).id
    transfer.aggregate = aggregate.id
    transfer.token = getTokenDetails(event.address).id
    transfer.save()
  }
}
