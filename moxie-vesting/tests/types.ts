/**Token lock manager events */

// event MasterCopyUpdated(address indexed masterCopy);
export class MasterCopyUpdatedInput {
  contractAddress: string
  hash: string
  masterCopy: string
}
// event TokenLockCreated(
//     address indexed contractAddress,
//     bytes32 indexed initHash,
//     address indexed beneficiary,
//     address token,
//     uint256 managedAmount,
//     uint256 startTime,
//     uint256 endTime,
//     uint256 periods,
//     uint256 releaseStartTime,
//     uint256 vestingCliffTime,
//     IMoxieTokenLock.Revocability revocable
// );
export class TokenLockCreatedInput {
  contractAddress: string
  hash: string
  initHash: string
  beneficiary: string
  token: string
  managedAmount: string
  startTime: string
  endTime: string
  periods: string
  releaseStartTime: string
  vestingCliffTime: string
  revocable: string
}

// event TokensDeposited(address indexed sender, uint256 amount);
export class TokensDepositedInput {
  contractAddress: string
  hash: string
  sender: string
  amount: string
}
// event TokensWithdrawn(address indexed sender, uint256 amount);
export class TokensWithdrawnInput {
  contractAddress: string
  hash: string
  sender: string
  amount: string
}
// event FunctionCallAuth(address indexed caller, bytes4 indexed sigHash, address indexed target, string signature);
export class FunctionCallAuthInput {
  contractAddress: string
  hash: string
  caller: string
  sigHash: string
  target: string
  signature: string
}
// event TokenDestinationAllowed(address indexed dst, bool allowed);
export class TokenDestinationAllowedInput {
  contractAddress: string
  hash: string
  dst: string
  allowed: boolean
}
// event MoxiePassTokenUpdated(address indexed moxiePassToken);
export class MoxiePassTokenUpdatedInput {
  contractAddress: string
  hash: string
  moxiePassToken: string
}

/** Token lock wallet events */
// event TokensReleased(address indexed beneficiary, uint256 amount);
export class TokenLockTokensReleasedInput {
  contractAddress: string
  hash: string
  beneficiary: string
  amount: string
}
// event TokensWithdrawn(address indexed beneficiary, uint256 amount);
export class TokenLockTokensWithdrawnInput {
  contractAddress: string
  hash: string
  beneficiary: string
  amount: string
}
// event TokensRevoked(address indexed beneficiary, uint256 amount);
export class TokenLockTokensRevokedInput {
  contractAddress: string
  hash: string
  beneficiary: string
  amount: string
}
// event BeneficiaryChanged(address newBeneficiary);
export class TokenLockBeneficiaryChangedInput {
  contractAddress: string
  hash: string
  newBeneficiary: string
}
// event LockAccepted();
export class TokenLockLockAcceptedInput {
  contractAddress: string
  hash: string
}

export class TokenLockLockCanceledInput {
  contractAddress: string
  hash: string
}

// event ManagerUpdated(address indexed _oldManager, address indexed _newManager);
export class TokenLockManagerUpdatedInput {
  contractAddress: string
  hash: string
  oldManager: string
  newManager: string
}
// event TokenDestinationsApproved();
export class TokenLockTokenDestinationsApprovedInput {
  contractAddress: string
  hash: string
}
// event TokenDestinationsRevoked();
export class TokenLockTokenDestinationsRevokedInput {
  contractAddress: string
  hash: string
}
