export class Transaction {
  hash: string
  constructor(hash: string) {
    this.hash = hash
  }
}
/**Vault events */

// event VaultTransfer(
//     address indexed subject,
//     address indexed token,
//     address indexed to,
//     uint256 amount,
//     uint256 totalReserve
// );
export class VaultVaultTransferInput extends Transaction {
  subject: string
  token: string
  to: string
  amount: string
  totalReserve: string
}
// event VaultDeposit(
//     address indexed subject,
//     address indexed token,
//     address indexed sender,
//     uint256 amount,
//     uint256 totalReserve
// );
export class VaultVaultDepositInput extends Transaction {
  subject: string
  token: string
  sender: string
  amount: string
  totalReserve: string
}

/** TokenManager */
// event TokenDeployed(
//     address _beneficiary,
//     address _token,
//     uint256 _initialSupply
// );
export class TokenManagerTokenDeployedInput extends Transaction {
  beneficiary: string
  token: string
  initialSupply: string
  constructor(
    hash: string,
    beneficiary: string,
    token: string,
    initialSupply: string
  ) {
    super(hash) // Call the constructor of the Transaction class
    this.beneficiary = beneficiary
    this.token = token
    this.initialSupply = initialSupply
  }
}

/** MoxieBondingCurve */

// event BondingCurveInitialized(
//     address _subject,
//     address _subjectToken,
//     uint256 _initialSupply,
//     uint256 _reserve,
//     uint32 _reserveRatio
// );
export class MoxieBondingCurveBondingCurveInitializedInput extends Transaction {
  subject: string
  subjectToken: string
  initialSupply: string
  reserve: string
  reserveRatio: string
  constructor(
    hash: string,
    subject: string,
    subjectToken: string,
    initialSupply: string,
    reserve: string,
    reserveRatio: string
  ) {
    super(hash)
    this.subject = subject
    this.subjectToken = subjectToken
    this.initialSupply = initialSupply
    this.reserve = reserve
    this.reserveRatio = reserveRatio
  }
}

// event SubjectSharePurchased(
//     address _subject,
//     address _sellToken,
//     uint256 _sellAmount,
//     address _buyToken,
//     uint256 _buyAmount,
//     address _beneficiary
// );
export class MoxieBondingCurveSubjectSharePurchasedInput extends Transaction {
  subject: string
  sellToken: string
  sellAmount: string
  buyToken: string
  buyAmount: string
  beneficiary: string
  constructor(
    hash: string,
    subject: string,
    sellToken: string,
    sellAmount: string,
    buyToken: string,
    buyAmount: string,
    beneficiary: string
  ) {
    super(hash)
    this.subject = subject
    this.sellToken = sellToken
    this.sellAmount = sellAmount
    this.buyToken = buyToken
    this.buyAmount = buyAmount
    this.beneficiary = beneficiary
  }
}

// event SubjectShareSold(
//     address _subject,
//     address _sellToken,
//     uint256 _sellAmount,
//     address _buyToken,
//     uint256 _buyAmount,
//     address _beneficiary
// );
export class MoxieBondingCurveSubjectShareSoldInput extends Transaction {
  subject: string
  sellToken: string
  sellAmount: string
  buyToken: string
  buyAmount: string
  beneficiary: string
  constructor(
    hash: string,
    subject: string,
    sellToken: string,
    sellAmount: string,
    buyToken: string,
    buyAmount: string,
    beneficiary: string
  ) {
    super(hash)
    this.subject = subject
    this.sellToken = sellToken
    this.sellAmount = sellAmount
    this.buyToken = buyToken
    this.buyAmount = buyAmount
    this.beneficiary = beneficiary
  }
}

// event UpdateFees(
//         uint256 _protocolBuyFeePct,
//         uint256 _protocolSellFeePct,
//         uint256 _subjectBuyFeePct,
//         uint256 _subjectSellFeePct
// );

export class MoxieBondingCurveUpdateFeesInput extends Transaction {
  protocolBuyFeePct: string
  protocolSellFeePct: string
  subjectBuyFeePct: string
  subjectSellFeePct: string
}

//  event UpdateFormula(address _formula);
export class MoxieBondingCurveUpdateFormula extends Transaction {
  formula: string
}
