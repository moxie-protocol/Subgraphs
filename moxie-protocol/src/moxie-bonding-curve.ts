import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, UpdateFormula } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { Order } from "../generated/schema"

import { handleBondingCurveInitializedTx, handleSubjectSharePurchasedTx, handleSubjectShareSoldTx, handleUpdateBeneficiaryTx, handleUpdateFeesTx, handleUpdateFormulaTx } from "./moxie-bonding-curve-tx"
import { getOrCreatePortfolio, getOrCreateSubject, getOrCreateUser, saveSubject } from "./utils"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  handleBondingCurveInitializedTx(event)
}

export function handleSubjectSharePurchased(event: SubjectSharePurchased): void {
  // BUY - BUY fan tokens
  // mint subjectToken of shares_ to _onBehalfOf
  // msg.sender Transfer deposit amount (MOXIE) from subject to bonding curve

  // 1. transfer deposit amount (MOXIE) from subject to bonding curve
  // 2. transfers subject fee (in MOXIE) to subject beneficiary (_subject)
  // 3. transfers protocol fee (in MOXIE) to protocol beneficiary
  // 4. deposit rest of amount to vault
  // 5. mint shares (subjectToken) to _onBehalfOf
  //   event SubjectSharePurchased(
  //     address _subject,
  //     address _sellToken : address(MOXIE),
  //     uint256 _sellAmount : _depositAmount,
  //     address _buyToken : address(_subjectToken),
  //     uint256 _buyAmount : shares_,
  //     address _beneficiary : _onBehalfOf
  // );

  handleSubjectSharePurchasedTx(event)

  let price = event.params._buyAmount.divDecimal(new BigDecimal(event.params._sellAmount))
  let user = getOrCreateUser(event.params._beneficiary)

  let subject = getOrCreateSubject(event.params._buyToken)
  subject.currentPrice = price
  subject.volume = subject.volume.plus(event.params._sellAmount)
  saveSubject(subject, event.block.timestamp)
  // Saving order entity
  let orderId = event.transaction.hash.toHex().concat("-").concat(event.logIndex.toString())
  let order = new Order(orderId)
  order.protocolToken = event.params._sellToken
  order.protocolTokenAmount = event.params._sellAmount
  order.subjectToken = subject.id
  order.subjectAmount = event.params._buyAmount
  order.orderType = "BUY"
  order.user = user.id
  order.price = price

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.params._beneficiary, event.params._buyToken, event.block.timestamp)
  portfolio.subjectTokenQuantity = portfolio.subjectTokenQuantity.plus(event.params._buyAmount)
  portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.plus(event.params._sellAmount)
  portfolio.save()

  order.portfolio = portfolio.id
  order.save()
  // updating user's orders
  let orders = user.buyOrders
  orders.push(order.id)
  user.buyOrders = orders
  user.save()
}

export function handleSubjectShareSold(event: SubjectShareSold): void {
  // SELL - SELL fan tokens to bonding curve
  // 1. transfer _sellAmount shares (subjectToken) from _subject to bonding curve
  // 2. burns shares (subjectToken) of amount _sellAmount
  // 3. transfers returnAmountWithoutFee (MOXIE) from vault to bonding curve
  // 4. transfer subjectFee (MOXIE) to subject beneficiary
  // 5. transfer protocolfee (MOXIE) to feeBeneficiary
  // 6. transfer returnedAmount_ (MOXIE) to _onBehalfOf
  //   event SubjectShareSold(
  //     address _subject,
  //     address _sellToken,: address(_subjectToken),
  //     uint256 _sellAmount,: _sellAmount,
  //     address _buyToken,: address(token),
  //     uint256 _buyAmount,:returnedAmount_,
  //     address _beneficiary:_onBehalfOf
  // );
  handleSubjectShareSoldTx(event)
  let price = event.params._sellAmount.divDecimal(new BigDecimal(event.params._buyAmount))
  let subject = getOrCreateSubject(event.params._sellToken)
  subject.currentPrice = price
  subject.volume = subject.volume.plus(event.params._buyAmount)
  saveSubject(subject, event.block.timestamp)

  let user = getOrCreateUser(event.transaction.from)
  
  // Saving order entity
  let orderId = event.transaction.hash.toHex().concat("-").concat(event.logIndex.toString())
  let order = new Order(orderId)
  order.protocolToken = event.params._buyToken
  order.protocolTokenAmount = event.params._buyAmount
  order.subjectToken = subject.id
  order.subjectAmount = event.params._sellAmount
  order.orderType = "SELL"
  order.user = user.id
  order.price = price

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.transaction.from, event.params._sellToken, event.block.timestamp)
  portfolio.subjectTokenQuantity = portfolio.subjectTokenQuantity.minus(event.params._sellAmount)
  portfolio.protocolTokenSpent = portfolio.protocolTokenSpent.minus(event.params._buyAmount)
  portfolio.save()

  order.portfolio = portfolio.id
  order.save()

  // updating user's orders
  let orders = user.sellOrders
  orders.push(order.id)
  user.sellOrders = orders
  user.save()
}

export function handleUpdateBeneficiary(event: UpdateBeneficiary): void {
  handleUpdateBeneficiaryTx(event)
}

export function handleUpdateFees(event: UpdateFees): void {
  handleUpdateFeesTx(event)
}

export function handleUpdateFormula(event: UpdateFormula): void {
  handleUpdateFormulaTx(event)
}
