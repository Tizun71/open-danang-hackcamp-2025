import { ethers } from "ethers";

// Connect to an Ethereum provider (e.g., mainnet, testnet, or local)
const provider = new ethers.JsonRpcProvider(
  "https://testnet-passet-hub-eth-rpc.polkadot.io/"
);

// Address you want to get the bytecode from
const contractAddress = "0xD78DdE1Ecc234335A06a1047263c3101f47B7959"; // Example: USDT contract

async function getBytecode() {
  const bytecode = await provider.getCode(contractAddress);
  console.log("Bytecode:", bytecode);
}

getBytecode();
