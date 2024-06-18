export class Transaction {
  contractAddress: string
  hash: string
}
/**Vault events */

// event VaultTransfer(
//     address indexed subject,
//     address indexed token,
//     address indexed to,
//     uint256 amount,
//     uint256 totalReserve
// );
export class VaultTransferInput extends Transaction {
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
export class VaultDepositInput extends Transaction {
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
export class TokenDeployedInput extends Transaction {
  beneficiary: string
  token: string
  initialSupply: string
}

/** SubjectFactory */

//  event SubjectOnboardingFinished(
//     address _subject,
//     address _subjectToken,
//     uint256 _auctionId,
//     uint256 _bondingSupply,
//     uint256 _bondingAmount,
//     uint256 _protocolFee,
//     uint256 _subjectFee
// );
export class SubjectOnboardingFinishedInput extends Transaction {
  subject: string
  subjectToken: string
  auctionId: string
  bondingSupply: string
  bondingAmount: string
  protocolFee: string
  subjectFee: string
}
// event UpdateBeneficiary(address _beneficiary);
export class UpdateBeneficiaryInput extends Transaction {
  beneficiary: string
}
// event UpdateFees(
//       uint256 _protocolFeePct,
//       uint256 _subjectFeePct
//   );
export class UpdateFeesInput extends Transaction {
  protocolFeePct: string
  subjectFeePct: string
}
// event UpdateAuctionParam(
//     uint256 _auctionDuration,
//     uint256 _auctionOrderCancellationDuration
// );
export class UpdateAuctionParamInput extends Transaction {
  auctionDuration: string
  auctionOrderCancellationDuration: string
}

/** MoxieBondingCurve */

// event BondingCurveInitialized(
//     address _subject,
//     address _subjectToken,
//     uint256 _initialSupply,
//     uint256 _reserve,
//     uint32 _reserveRatio
// );
export class BondingCurveInitializedInput extends Transaction {
  subject: string
  subjectToken: string
  initialSupply: string
  reserve: string
  reserveRatio: string
}

// event SubjectSharePurchased(
//     address _subject,
//     address _sellToken,
//     uint256 _sellAmount,
//     address _buyToken,
//     uint256 _buyAmount,
//     address _beneficiary
// );
export class SubjectSharePurchasedInput extends Transaction {
  subject: string
  sellToken: string
  sellAmount: string
  buyToken: string
  buyAmount: string
  beneficiary: string
}

// event SubjectShareSold(
//     address _subject,
//     address _sellToken,
//     uint256 _sellAmount,
//     address _buyToken,
//     uint256 _buyAmount,
//     address _beneficiary
// );
export class SubjectShareSoldInput extends Transaction {
  subject: string
  sellToken: string
  sellAmount: string
  buyToken: string
  buyAmount: string
  beneficiary: string
}
