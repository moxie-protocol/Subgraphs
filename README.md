# Moxie Protocol Subgraphs

This repository contains the source code for 3 official Moxie subgraphs:

- Protocol
- Auction
- Vesting

## Table Of Contents

- [Pre-requisites](#pre-requisites)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [License](#License)

## Pre-requisites

- [The Graph CLI](https://www.npmjs.com/package/@graphprotocol/graph-cli)
- [Create Subgraph on Subgraph Studio](https://www.youtube.com/embed/nGIFuC69bSA?start=15&end=130)

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

Then, make sure that your Graph CLI is authenticated:

```sh
graph auth
```

Once authenticated, generate an AssemblyScript types for the smart contract ABIs and the subgraph schema and compiles the subgraph to WebAssembly:

```sh
graph codegen && graph build
```

Once the process is executed successfully, simply run the following command to deploy to the Subgraph Studio:

```sh
graph deploy --studio <SUBGRAPH_SLUG>
```

## License

GNU General Public License v3.0