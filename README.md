<div align="center">
  <a align="center" href="https://moxie.xyz" target="_blank">
    <img src="./assets/logo.avif" alt="code snippets" height=50/>
  </a>
  <h1 align="center">Subgraphs</h1>
</div>

This repository contains the official source code for the Moxie subgraphs. Currently, the subgraph index Moxie protocol on the Base Sepolia tesnet and there are 5 subgraphs:

- [Protocol Transactional](https://testnets.graph-eu.p2pify.com/1c05ccc3dd91e719ae76b199e1088e53/sgr-711-852-408/graphql)
- [Protocol Stats](https://testnets.graph-eu.p2pify.com/b5be556230af1a9764779d891b080d79/sgr-226-411-703/graphql)
- [Auction Transactional](https://testnets.graph-eu.p2pify.com/0e43a29318b2a7676fb046d18550ff9c/sgr-872-925-936/graphql)
- [Auction Stats](https://testnets.graph-eu.p2pify.com/cd5f276513c5f775161de72d4f07ea78/sgr-362-924-871/graphql)
- [Vesting](https://testnets.graph-eu.p2pify.com/025b612e66120d40e6e7d53364589197/sgr-948-263-764/graphql)

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
