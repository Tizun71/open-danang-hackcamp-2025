require("dotenv").config();
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { JsonRpcProvider } = require("ethers");

async function deploy() {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = process.env.AH_PRIV_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);

  const factoryArtifact = await hre.artifacts.readArtifact("UniswapV2Factory");

  const Factory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    wallet
  );

  const pair = await Factory.deploy(wallet.address);
  console.log(`Factory deployed to: ${await pair.getAddress()}`);
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
