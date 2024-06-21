import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../generated/TokenManager/ERC20"
import { Portfolio, Subject, User } from "../generated/schema"

export function getOrCreateSubject(tokenAddress: Address): Subject {
  let subject = Subject.load(tokenAddress.toHexString())
  if (!subject) {
    subject = new Subject(tokenAddress.toHexString())
    let token = ERC20.bind(tokenAddress)
    subject.name = token.name()
    subject.symbol = token.symbol()
    subject.decimals = BigInt.fromI32(token.decimals())
    // setting default values for now
    subject.reserve = BigInt.fromI32(0)
    subject.currentPrice = BigDecimal.fromString("0")
    subject.totalSupply = BigInt.fromI32(0)
    subject.uniqueHolders = BigInt.fromI32(0)
    subject.holders = []
    subject.save()
  }
  return subject
}

export function getOrCreatePortfolio(
  userAddress: Address,
  subjectAddress: Address
): Portfolio {
  let user = getOrCreateUser(userAddress)
  let portfolioId =
    userAddress.toHexString() + "-" + subjectAddress.toHexString()
  let portfolio = Portfolio.load(portfolioId)
  if (!portfolio) {
    portfolio = new Portfolio(portfolioId)
    let subject = getOrCreateSubject(subjectAddress)
    // incrementing uniqueHolders
    subject.uniqueHolders = subject.uniqueHolders.plus(BigInt.fromI32(1))
    portfolio.user = user.id
    portfolio.subject = subject.id
    portfolio.subjectTokenQuantity = BigInt.fromI32(0)
    portfolio.protocolTokenSpent = BigInt.fromI32(0)
    portfolio.save()
  }
  return portfolio
}

export function getOrCreateUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString())
  if (!user) {
    user = new User(userAddress.toHexString())
    user.save()
  }
  return user
}
