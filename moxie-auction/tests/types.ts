// event AuctionCleared(
//     uint256 indexed auctionId,
//     uint96 soldAuctioningTokens,
//     uint96 soldBiddingTokens,
//     bytes32 clearingPriceOrder
// );
export class AuctionClearedInput {
  hash: string
  auctionId: string
  soldAuctioningTokens: string
  soldBiddingTokens: string
  clearingPriceOrder: string
}

// event CancellationSellOrder(
//      uint256 indexed auctionId,
//      uint64 indexed userId,
//      uint96 buyAmount,
//      uint96 sellAmount
//  );
export class CancellationSellOrderInput {
  hash: string
  auctionId: string
  userId: string
  buyAmount: string
  sellAmount: string
}

// event ClaimedFromOrder(
//     uint256 indexed auctionId,
//     uint64 indexed userId,
//     uint96 buyAmount,
//     uint96 sellAmount
// );
export class ClaimedFromOrderInput {
  hash: string
  auctionId: string
  userId: string
  buyAmount: string
  sellAmount: string
}

// event NewAuction(
//     uint256 indexed auctionId,
//     IERC20 indexed _auctioningToken,
//     IERC20 indexed _biddingToken,
//     uint256 orderCancellationEndDate,
//     uint256 auctionEndDate,
//     uint64 userId,
//     uint96 _auctionedSellAmount,
//     uint96 _minBuyAmount,
//     uint256 minimumBiddingAmountPerOrder,
//     uint256 minFundingThreshold,
//     address allowListContract,
//     bytes allowListData
// );
export class NewAuctionInput {
  hash: string
  auctionId: string
  _auctioningToken: string
  _biddingToken: string
  orderCancellationEndDate: string
  auctionEndDate: string
  userId: string
  _auctionedSellAmount: string
  _minBuyAmount: string
  minimumBiddingAmountPerOrder: string
  minFundingThreshold: string
  allowListContract: string
  allowListData: string
}

// event NewSellOrder(
//     uint256 indexed auctionId,
//     uint64 indexed userId,
//     uint96 buyAmount,
//     uint96 sellAmount
// );
export class NewSellOrderInput {
  hash: string
  auctionId: string
  userId: string
  buyAmount: string
  sellAmount: string
}

// event NewUser(uint64 indexed userId, address indexed userAddress);
export class NewUserInput {
  hash: string
  userId: string
  userAddress: string
}

// event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
export class OwnershipTransferredInput {
  hash: string
  previousOwner: string
  newOwner: string
}

// event UserRegistration(address indexed user, uint64 userId);
export class UserRegistrationInput {
  hash: string
  user: string
  userId: string
}
