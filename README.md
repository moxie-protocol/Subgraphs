<div align="center">
  <a align="center" href="https://moxie.xyz" target="_blank">
    <img src="./assets/logo.avif" alt="code snippets" height=50/>
  </a>
  <h1 align="center">Subgraphs</h1>
</div>

This repository contains the official source code for the Moxie subgraphs. Currently, there are 3 subgraphs:

- Protocol Stats Subgraph
  - [Subgraph Studio](https://api.studio.thegraph.com/query/23537/moxie_protocol_stats_mainnet/version/latest)
  - [Network Subgraph](https://thegraph.com/explorer/subgraphs/7zS29h4BDSujQq8R3TFF37JfpjtPQsRUpoC9p4vo4scx?view=Query&chain=arbitrum-one)
- Protocol Minimal Subgraph
  - [Subgraph Studio](https://api.studio.thegraph.com/query/23537/moxie_protocol_minimal_mainnet/version/latest)
  - [Network Subgraph](https://thegraph.com/explorer/subgraphs/EXRKnsoBNwWk134nV5aezpZCPwcD6RWRCWMM2S7KXJXe?view=Query&chain=arbitrum-one)
- Auction Stats Subgraph
  - [Subgraph Studio](https://api.studio.thegraph.com/query/23537/moxie_auction_stats_mainnet/version/latest)
  - [Network Subgraph](https://thegraph.com/explorer/subgraphs/BDAX81dfjwhDu71Dhe7qETves9ptQ9xsstFSsuVu1NXn?view=Query&chain=arbitrum-one)
- Auction Minimal Subgraph
  - [Subgraph Studio](https://api.studio.thegraph.com/query/23537/moxie_auction_minimal_mainnet/version/latest)
  - [Network Subgraph](https://thegraph.com/explorer/subgraphs/HMuQ6NQNRcuK8PrbVD8HEzUxdsAixcwdANLRyvJegR3a?view=Query&chain=arbitrum-one)
- Vesting Subgraph
  - [Subgraph Studio](https://api.studio.thegraph.com/query/23537/moxie_vesting_mainnet/version/latest)
  - [Network Subgraph](https://thegraph.com/explorer/subgraphs/BuR6zAj2GSVZz6smGbJZkgQx8S6GUS881R493ZYZKSk3?view=Query&chain=arbitrum-one)

Keep in mind that the Graph Studio APIs are rate-limited, thus if you need higher limit, it's best that you [deploy](#deployment) to your own Graph Indexer Node.

## Table Of Contents

- [Pre-requisites](#pre-requisites)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [License](#license)

## Pre-requisites

- [The Graph CLI](https://www.npmjs.com/package/@graphprotocol/graph-cli)

## Local Setup

First, enter the folder of subgraph you would like to work with:

```sh
cd <SUBGRAPH_FOLDER>
```

then, install the dependencies:

```sh
npm i
```

## Deployment

First, enter the folder of subgraph you would like to deploy:

```sh
cd <SUBGRAPH_FOLDER>
```

Once you are in one of the subgraph folder, run the preparation script:

```sh
# `npm run prepare:base-sepolia` for indexing Base Sepolia Testnet
npm run prepare:base
```

Then, create a subgraph on your Graph Indexer Node:

```sh
graph create --node <GRAPH_NODE_URL> <SUBGRAPH_NAME>
```

Once the subgraph is created, generate an AssemblyScript types for the smart contract ABIs and the subgraph schema and compiles the subgraph to WebAssembly:

```sh
graph codegen && graph build
```

Once the process is executed successfully, simply run the following command to deploy to your Graph Indexer Node:

```sh
graph deploy --node <GRAPH_NODE_URL> <SUBGRAPH_NAME>
```

## Contributing

If you'd like to contribute to the Moxie subgraph repository or fix a bug please make sure to take a look at [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

GNU General Public License v3.0
