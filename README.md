<div align="center">
  <a align="center" href="https://moxie.xyz" target="_blank">
    <img src="./assets/logo.avif" alt="code snippets" height=50/>
  </a>
  <h1 align="center">Subgraphs</h1>
</div>

This repository contains the official source code for the Moxie subgraphs. Currently, there are 3 subgraphs:

- Protocol
  - Studio: https://api.studio.thegraph.com/query/27864/protocol/v5.1.6/graphql
- Auction
  - Studio: https://api.studio.thegraph.com/proxy/82737/auction/v.4.0.6
- Vesting
  - Stuido: https://api.studio.thegraph.com/query/82737/vesting/v.4.2

Keep in mind that the Graph Studio APIs are rate-limited, thus if you need higher limit, it's best that you [deploy](#deployment) to your own Graph Indexer Node.

## Table Of Contents

- [Pre-requisites](#pre-requisites)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [License](#License)

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

Then, create a subgraph on your Graph Indexer Node:

```sh
graph create --node <GRAPH_NODE_URL>
```

Once authenticated, generate an AssemblyScript types for the smart contract ABIs and the subgraph schema and compiles the subgraph to WebAssembly:

```sh
graph codegen && graph build
```

Once the process is executed successfully, simply run the following command to deploy to your Graph Indexer Node:

```sh
graph deploy --node <GRAPH_NODE_URL>
```

## Contributing

If you'd like to contribute to the Moxie subgraph repository or fix a bug please make sure to take a look at [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

GNU General Public License v3.0