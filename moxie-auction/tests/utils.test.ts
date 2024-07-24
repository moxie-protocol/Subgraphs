import { describe, test, clearStore, beforeEach, assert } from "matchstick-as/assembly/index"
import { AuctionDetail, User, Order, Token } from "../generated/schema"
import { mockAuctionCleared, mockCancellationSellOrder, mockClaimedFromOrder, mockNewAuction, mockNewSellOrder, mockNewUser, mockOwnershipTransferred, mockUserRegistration } from "./mocks"
import { AuctionClearedInput, AuctionEntityInput, CancellationSellOrderInput, ClaimedFromOrderInput, NewAuctionInput, NewSellOrderInput, NewUserInput, OrderEntityInput, OwnershipTransferredInput, UserRegistrationInput } from "./types"
import { handleAuctionClearedTx, handleCancellationSellOrderTx, handleClaimedFromOrderTx, handleNewAuctionTx, handleNewSellOrderTx, handleNewUserTx, handleOwnershipTransferredTx, handleUserRegistrationTx } from "../src/transactions"
import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { sortOrders } from "../src/utils/sortOrders"
import { convertToPricePoint, getEncodedOrderId, updateAuctionStats } from "../src/utils"
describe("utils", () => {
  beforeEach(() => {
    clearStore()
  })
  describe("sortOrders", () => {
    test("test sortOrders", () => {
      let orders: Array<string> = ["2-200-100-2", "1-100-100-1", "4-400-100-4", "3-300-100-3"]
      let sortedOrders = sortOrders(orders)
      // user sells 100 moxies to buy 100 fan token , price of fan token is 1
      assert.stringEquals(sortedOrders[0], "1-100-100-1")
      // user sells 200 moxies to buy 100 fan token , price of fan token is 2
      assert.stringEquals(sortedOrders[1], "2-200-100-2")
      // user sells 300 moxies to buy 100 fan token , price of fan token is 3
      assert.stringEquals(sortedOrders[2], "3-300-100-3")
      // user sells 400 moxies to buy 100 fan token , price of fan token is 4
      assert.stringEquals(sortedOrders[3], "4-400-100-4")
    })
    test("test sortOrders 2", () => {
      let orders: Array<string> = ["2-100-200-2", "1-100-100-1", "4-100-400-4", "3-100-300-3"]
      let sortedOrders = sortOrders(orders)
      // user sells 100 moxies to buy 400 fan token , price of fan token is 0.25
      assert.stringEquals(sortedOrders[0], "4-100-400-4")
      // user sells 100 moxies to buy 300 fan token , price of fan token is 0.33
      assert.stringEquals(sortedOrders[1], "3-100-300-3")
      // user sells 100 moxies to buy 200 fan token , price of fan token is 0.5
      assert.stringEquals(sortedOrders[2], "2-100-200-2")
      // user sells 100 moxies to buy 100 fan token , price of fan token is 1
      assert.stringEquals(sortedOrders[3], "1-100-100-1")
    })
  })
  describe("convertToPricePoint", () => {
    test("test convertToPricePoint", () => {
      // user wants to sell 100 moxies to buy 200 fan token
      // calculated price of fan token is 0.5
      let pricePoint = convertToPricePoint(BigInt.fromString("100"), BigInt.fromString("200"), 18, 18)
      assert.stringEquals(pricePoint!.get("price")!.toString(), "0.5")
      // 100 * 10 ^ -18
      assert.stringEquals(pricePoint!.get("volume")!.toString(), "0.0000000000000001")
    })

    test("test convertToPricePoint 2", () => {
      // user wants to sell 100 moxies to buy 200 fan token
      // calculated price of fan token is 0.5
      let pricePoint = convertToPricePoint(BigInt.fromString("100"), BigInt.fromString("200"), 18, 18)
      assert.stringEquals(pricePoint!.get("price")!.toString(), "0.5")
      // 100 * 10 ^ -18
      assert.stringEquals(pricePoint!.get("volume")!.toString(), "0.0000000000000001")
    })
  })

  describe("updateAuctionStats", () => {
    test("test updateAuctionStats", () => {
      const initialAuction: AuctionEntityInput = {
        txHash: "0xc3c8012e80d9875c5362f57aea8152c155e1a4c8a0b77b2a61fdeba41ebdb007",
        id: "10",
        auctionId: "10",
        exactOrder: {
          id: "10-250000000000000000000-487500000000000000000000-14",
          sellAmount: "250000000000000000000",
          buyAmount: "487500000000000000000000",
          price: "1950",
          volume: "250",
          timestamp: "1617704654",
          status: "Placed",
          user: {
            id: "14",
            address: "0xd1b368b353bffaf250aff21a0faeebf43133a619",
          },
        },
        auctioningToken: {
          id: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          symbol: "WETH",
          decimals: "18",
        },
        biddingToken: {
          id: "0x6b175474e89094c44da98b954eedeac495271d0f",
          symbol: "DAI",
          decimals: "18",
        },
        activeOrders: [
          {
            id: "10-4402382109097717447722-2255318703431207708-15",
            sellAmount: "4402382109097717447722",
            buyAmount: "2255318703431207708",
            price: "1952.000000000000000756434111686529",
            volume: "4402.382109097717447722",
            timestamp: "1617723338",
            status: "Placed",
            user: {
              id: "15",
              address: "0xcea78aaa93e917fb5e1802901db2b20aa4411b44",
            },
          },
        ],
        auctionEndDate: "1617732000",
        orderCancellationEndDate: "1617728400",
        startingTimeStamp: "1617704654",
        minimumBiddingAmountPerOrder: "500000000000000000000",
        minFundingThreshold: "100000000000000000000000",
        allowListManager: "0x0000000000000000000000000000000000000000",
        allowListSigner: "0x",
        currentVolume: "0",
        currentClearingOrderSellAmount: "0",
        currentClearingOrderBuyAmount: "0",
        currentClearingPrice: "1950",
        currentBiddingAmount: "0",
        isAtomicClosureAllowed: true,
        isPrivateAuction: false,
        interestScore: "0",
        uniqueBidders: "0",
        isCleared: false,
      }
      let user1 = new User(initialAuction.exactOrder.user.address)
      user1.id = initialAuction.exactOrder.user.id
      user1.address = Bytes.fromHexString(initialAuction.exactOrder.user.address)
      user1.createdAuctions = []
      user1.participatedAuctions = []
      user1.save()
      let user2 = new User(initialAuction.activeOrders[0].user.address)
      user2.id = initialAuction.activeOrders[0].user.id
      user2.address = Bytes.fromHexString(initialAuction.activeOrders[0].user.address)
      user2.createdAuctions = []
      user2.participatedAuctions = []
      user2.save()
      let order1 = new Order(initialAuction.exactOrder.id)
      order1.sellAmount = BigInt.fromString(initialAuction.exactOrder.sellAmount)
      order1.buyAmount = BigInt.fromString(initialAuction.exactOrder.buyAmount)
      order1.price = BigDecimal.fromString(initialAuction.exactOrder.price)
      order1.volume = BigDecimal.fromString(initialAuction.exactOrder.volume)
      order1.timestamp = BigInt.fromString(initialAuction.exactOrder.timestamp)
      order1.status = initialAuction.exactOrder.status
      order1.user = initialAuction.exactOrder.user.id
      order1.save()

      let order2 = new Order(initialAuction.activeOrders[0].id)
      order2.id = initialAuction.activeOrders[0].id
      order2.sellAmount = BigInt.fromString(initialAuction.activeOrders[0].sellAmount)
      order2.buyAmount = BigInt.fromString(initialAuction.activeOrders[0].buyAmount)
      order2.price = BigDecimal.fromString(initialAuction.activeOrders[0].price)
      order2.volume = BigDecimal.fromString(initialAuction.activeOrders[0].volume)
      order2.timestamp = BigInt.fromString(initialAuction.activeOrders[0].timestamp)
      order2.status = initialAuction.activeOrders[0].status
      order2.user = initialAuction.activeOrders[0].user.id
      order2.save()

      let token1 = new Token(initialAuction.auctioningToken.id)
      token1.symbol = initialAuction.auctioningToken.symbol
      token1.decimals = BigInt.fromString(initialAuction.auctioningToken.decimals)
      token1.save()

      let token2 = new Token(initialAuction.biddingToken.id)
      token2.symbol = initialAuction.biddingToken.symbol
      token2.decimals = BigInt.fromString(initialAuction.biddingToken.decimals)
      token2.save()

      let auction = new AuctionDetail(initialAuction.id)
      auction.txHash = Bytes.fromHexString(initialAuction.txHash)
      auction.auctionId = BigInt.fromString(initialAuction.auctionId)
      auction.exactOrder = initialAuction.exactOrder.id
      auction.auctioningToken = initialAuction.auctioningToken.id
      auction.biddingToken = initialAuction.biddingToken.id
      auction.auctionEndDate = BigInt.fromString(initialAuction.auctionEndDate)
      auction.orderCancellationEndDate = BigInt.fromString(initialAuction.orderCancellationEndDate)
      auction.startingTimeStamp = BigInt.fromString(initialAuction.startingTimeStamp)
      auction.minimumBiddingAmountPerOrder = BigInt.fromString(initialAuction.minimumBiddingAmountPerOrder)
      auction.minFundingThreshold = BigInt.fromString(initialAuction.minFundingThreshold)
      auction.allowListManager = Bytes.fromHexString(initialAuction.allowListManager)
      auction.allowListSigner = Bytes.fromHexString(initialAuction.allowListSigner)
      auction.currentVolume = BigDecimal.fromString(initialAuction.currentVolume)
      auction.currentClearingOrderSellAmount = BigInt.fromString(initialAuction.currentClearingOrderSellAmount)
      auction.currentClearingOrderBuyAmount = BigInt.fromString(initialAuction.currentClearingOrderBuyAmount)
      auction.currentClearingPrice = BigDecimal.fromString(initialAuction.currentClearingPrice)
      auction.currentBiddingAmount = BigInt.fromString(initialAuction.currentBiddingAmount)
      auction.activeOrders = [initialAuction.activeOrders[0].id]
      auction.isAtomicClosureAllowed = initialAuction.isAtomicClosureAllowed
      auction.isPrivateAuction = initialAuction.isPrivateAuction
      auction.interestScore = BigDecimal.fromString(initialAuction.interestScore)
      auction.uniqueBidders = BigInt.fromString(initialAuction.uniqueBidders)
      auction.isCleared = initialAuction.isCleared
      auction.save()

      updateAuctionStats(BigInt.fromString(initialAuction.id))
      let updatedAuction = AuctionDetail.load(initialAuction.id)
      if (!updatedAuction) {
        throw new Error("Auction not found")
      }

      let order3Input: OrderEntityInput = {
        id: "10-270395632475159115860094-135197816237579557930-16",
        sellAmount: "270395632475159115860094",
        buyAmount: "135197816237579557930",
        price: "2000.000000000000000000695277502373",
        volume: "270395.632475159115860094",
        timestamp: "1617724592",
        status: "Placed",
        user: {
          id: "16",
          address: "0x03118e02ce007a0f0d1c9d806c2a7d5ae2f26995",
        },
      }
      let user3 = new User(order3Input.user.address)
      user3.id = order3Input.user.id
      user3.address = Bytes.fromHexString(order3Input.user.address)
      user3.createdAuctions = []
      user3.participatedAuctions = []
      user3.save()

      let order3 = new Order(order3Input.id)
      order3.id = order3Input.id
      order3.sellAmount = BigInt.fromString(order3Input.sellAmount)
      order3.buyAmount = BigInt.fromString(order3Input.buyAmount)
      order3.price = BigDecimal.fromString(order3Input.price)
      order3.volume = BigDecimal.fromString(order3Input.volume)
      order3.timestamp = BigInt.fromString(order3Input.timestamp)
      order3.status = order3Input.status
      order3.user = order3Input.user.id
      order3.save()
      let loadAuction = AuctionDetail.load(initialAuction.id)
      if (!loadAuction) {
        throw new Error("Auction not found")
      }
      let activeOrders: string[] = []
      if (loadAuction.activeOrders) {
        activeOrders = loadAuction.activeOrders!
      }
      activeOrders.push(order3.id)
      loadAuction.activeOrders = activeOrders
      loadAuction.save()

      updateAuctionStats(BigInt.fromString(loadAuction.id))
      loadAuction = AuctionDetail.load(initialAuction.id)
      if (!loadAuction) {
        throw new Error("Auction not found")
      }
      assert.stringEquals(loadAuction.currentClearingPrice.toString(), BigInt.fromString(initialAuction.exactOrder.buyAmount).div(BigInt.fromString(initialAuction.exactOrder.sellAmount)).toString())
      let biddingTokenTotal = BigInt.fromString(initialAuction.activeOrders[0].sellAmount).plus(BigInt.fromString(order3Input.sellAmount))

      let volume = new BigDecimal(biddingTokenTotal).times(BigDecimal.fromString(initialAuction.exactOrder.sellAmount).div(BigDecimal.fromString(initialAuction.exactOrder.buyAmount)))
      assert.stringEquals(volume.toString(), loadAuction.currentVolume.toString())
      assert.stringEquals(loadAuction.currentBiddingAmount.toString(), biddingTokenTotal.toString())
    })
  })

  describe("getEncodedOrderId", () => {
    let userId = BigInt.fromI32(6)
    let buyAmount = BigInt.fromString("501891953019004282")
    let sellAmount = BigInt.fromString("1003783906038008565844")
    assert.stringEquals(getEncodedOrderId(userId, buyAmount, sellAmount), "0x00000000000000060000000006f714127753257a000000366a4cd0443994d054")
  })
})
