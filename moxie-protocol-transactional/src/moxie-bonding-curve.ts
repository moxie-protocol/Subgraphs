import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import { BondingCurveInitialized, SubjectSharePurchased, SubjectShareSold, UpdateBeneficiary, UpdateFees, Initialized, MoxieBondingCurve } from "../generated/MoxieBondingCurve/MoxieBondingCurve"
import { User } from "../generated/schema"

import { calculateBuySideFee, calculateSellSideProtocolAmountAddingBackFees, getOrCreatePortfolio, getOrCreateSubjectToken, getOrCreateSummary, getOrCreateUser, savePortfolio, saveSubjectToken, saveUser } from "./utils"
export function handleBondingCurveInitialized(event: BondingCurveInitialized): void {
  let subjectToken = getOrCreateSubjectToken(event.params._subjectToken, event.block)
  subjectToken.reserveRatio = event.params._reserveRatio
  subjectToken.initialSupply = event.params._initialSupply
  let price = event.params._reserve.divDecimal(new BigDecimal(event.params._initialSupply))
  subjectToken.currentPriceInMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  saveSubjectToken(subjectToken, event.block)
}

export function handleSubjectSharePurchased(event: SubjectSharePurchased): void {
  // BUY - BUY fan tokens
  // mint subjectToken of shares_ to _onBehalfOf
  // _spender Transfer deposit amount (MOXIE) from subject to bonding curve

  // 1. transfer deposit amount (MOXIE) from subject to bonding curve
  // 2. transfers subject fee (in MOXIE) to subject beneficiary (_subject)
  // 3. transfers protocol fee (in MOXIE) to protocol beneficiary
  // 4. deposit rest of amount to vault
  // 5. mint shares (subjectToken) to _onBehalfOf
  //  event SubjectSharePurchased(
  //       address indexed _subject,
  //       address indexed _sellToken,
  //       uint256 _sellAmount,
  //       address _spender,
  //       address _buyToken,
  //       uint256 _buyAmount,
  //       address indexed _beneficiary
  //   );

  const fees = calculateBuySideFee(event.params._sellAmount)
  let protocolTokenSpentAfterFees = event.params._sellAmount.minus(fees.protocolFee).minus(fees.subjectFee)

  let user = getOrCreateUser(event.params._beneficiary, event.block)
  user.buyVolume = user.buyVolume.plus(event.params._sellAmount)
  saveUser(user, event.block)

  let subjectToken = getOrCreateSubjectToken(event.params._buyToken, event.block)
  subjectToken.buySideVolume = subjectToken.buySideVolume.plus(event.params._sellAmount)
  // calculating price here the sell amount will be in protocol token and buy amount is protocol token since it's a buy
  let price = protocolTokenSpentAfterFees.divDecimal(new BigDecimal(event.params._buyAmount))
  subjectToken.currentPriceInMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(event.params._sellAmount)
  saveSubjectToken(subjectToken, event.block)

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.params._beneficiary, event.params._buyToken, event.transaction.hash, event.block)
  portfolio.buyVolume = portfolio.buyVolume.plus(event.params._sellAmount)
  portfolio.subjectTokenBuyVolume = portfolio.subjectTokenBuyVolume.plus(event.params._buyAmount)
  savePortfolio(portfolio, event.block)
}

export function handleSubjectShareSold(event: SubjectShareSold): void {
  // SELL - SELL fan tokens to bonding curve
  // 1. transfer _sellAmount shares (subjectToken) from _subject to bonding curve
  // 2. burns shares (subjectToken) of amount _sellAmount
  // 3. transfers returnAmountWithoutFee (MOXIE) from vault to bonding curve
  // 4. transfer subjectFee (MOXIE) to subject beneficiary
  // 5. transfer protocolfee (MOXIE) to feeBeneficiary
  // 6. transfer returnedAmount_ (MOXIE) to _onBehalfOf
  // event SubjectShareSold(
  //     address indexed _subject,
  //     address indexed _sellToken,
  //     uint256 _sellAmount,
  //     address _spender,
  //     address _buyToken,
  //     uint256 _buyAmount,
  //     address indexed _beneficiary
  // );
  // SubjectShareSold event is in perspective of user, so _buyAmount is the amount user gets back(fees already deducted)
  let protocolTokenAmountReducingFees = event.params._buyAmount
  let protocolTokenAmount = calculateSellSideProtocolAmountAddingBackFees(protocolTokenAmountReducingFees)

  let subjectToken = getOrCreateSubjectToken(event.params._sellToken, event.block)
  let price = protocolTokenAmountReducingFees.divDecimal(new BigDecimal(event.params._sellAmount))
  subjectToken.currentPriceInMoxie = price
  subjectToken.currentPriceInWeiInMoxie = price.times(BigDecimal.fromString("1000000000000000000"))
  // volume uses amount with fees
  subjectToken.lifetimeVolume = subjectToken.lifetimeVolume.plus(protocolTokenAmount)
  // volume uses amount with fees
  subjectToken.sellSideVolume = subjectToken.sellSideVolume.plus(protocolTokenAmount)
  saveSubjectToken(subjectToken, event.block)

  let user = getOrCreateUser(event.params._beneficiary, event.block)
  // volume uses amount with fees
  user.sellVolume = user.sellVolume.plus(protocolTokenAmount)
  saveUser(user, event.block)

  // updating user's portfolio
  let portfolio = getOrCreatePortfolio(event.transaction.from, event.params._sellToken, event.transaction.hash, event.block)
  // volume uses amount with fees
  portfolio.sellVolume = portfolio.sellVolume.plus(protocolTokenAmount)
  savePortfolio(portfolio, event.block)
}

export function handleUpdateFees(event: UpdateFees): void {
  let summary = getOrCreateSummary()
  summary.protocolBuyFeePct = event.params._protocolBuyFeePct
  summary.protocolSellFeePct = event.params._protocolSellFeePct
  summary.subjectBuyFeePct = event.params._subjectBuyFeePct
  summary.subjectSellFeePct = event.params._subjectSellFeePct
  summary.save()
}

export function handleInitialized(event: Initialized): void {
  let bondingCurve = MoxieBondingCurve.bind(event.address)
  let protocolBuyFeePct = bondingCurve.protocolBuyFeePct()
  let protocolSellFeePct = bondingCurve.protocolSellFeePct()
  let subjectBuyFeePct = bondingCurve.subjectBuyFeePct()
  let subjectSellFeePct = bondingCurve.subjectSellFeePct()

  let summary = getOrCreateSummary()
  summary.protocolBuyFeePct = protocolBuyFeePct
  summary.protocolSellFeePct = protocolSellFeePct
  summary.subjectBuyFeePct = subjectBuyFeePct
  summary.subjectSellFeePct = subjectSellFeePct

  summary.save()
}
