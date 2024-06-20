import { Transfer } from "../generated/templates/SubjectTokenContract/ERC20"
import { SubjectTokenTransferTx } from "../generated/schema"

export function handleTransferTx(event: Transfer): void {
  let subjectTokenTransferTx = new SubjectTokenTransferTx(
    event.transaction.hash.toHexString()
  )
  subjectTokenTransferTx.from = event.params.from
  subjectTokenTransferTx.to = event.params.to
  subjectTokenTransferTx.value = event.params.value
  subjectTokenTransferTx.contractAddress = event.address
  subjectTokenTransferTx.save()
}
