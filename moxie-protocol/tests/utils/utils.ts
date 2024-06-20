import { Address, Bytes, ethereum, BigInt } from "@graphprotocol/graph-ts"

export function tupleArrayValue(arg: ethereum.Tuple[]): ethereum.Value {
  return ethereum.Value.fromTupleArray(arg)
}
export function addressValue(arg: string): ethereum.Value {
  return ethereum.Value.fromAddress(Address.fromString(arg))
}
export function bytesValue(arg: string): ethereum.Value {
  return ethereum.Value.fromBytes(Bytes.fromHexString(arg))
}
export function bigIntValue(arg: string): ethereum.Value {
  return ethereum.Value.fromUnsignedBigInt(BigInt.fromString(arg))
}

export function getStringEventParam(
  eventName: string,
  arg: string
): ethereum.EventParam {
  let eventParam = new ethereum.EventParam(
    eventName,
    ethereum.Value.fromString(arg)
  )
  return eventParam
}
export function getAddressEventParam(
  eventName: string,
  arg: string
): ethereum.EventParam {
  let eventParam = new ethereum.EventParam(eventName, addressValue(arg))
  return eventParam
}

export function getBytesEventParam(
  eventName: string,
  arg: string
): ethereum.EventParam {
  let eventParam = new ethereum.EventParam(eventName, bytesValue(arg))
  return eventParam
}
export function getBigIntEventParam(
  eventName: string,
  arg: string
): ethereum.EventParam {
  let eventParam = new ethereum.EventParam(eventName, bigIntValue(arg))
  return eventParam
}

export function getBooleanEventParam(
  eventName: string,
  arg: boolean
): ethereum.EventParam {
  let eventParam = new ethereum.EventParam(
    eventName,
    ethereum.Value.fromBoolean(arg)
  )
  return eventParam
}
