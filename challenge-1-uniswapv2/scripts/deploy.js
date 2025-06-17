const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // const WETH = await hre.ethers.getContractFactory("WETH");
  // const weth = await WETH.deploy();
  // await weth.waitForDeployment();
  // const WETHAddress = await weth.getAddress();
  // console.log("WETH deployed to:", WETHAddress);

  const Token = await hre.ethers.getContractFactory("UniswapV2ERC20");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  const Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  console.log("Creating WETH/UNI ...");
  const tx = await factory.createPair(WETHAddress, tokenAddress);
  await tx.wait();

  const pairAddress = await factory.getPair(WETHAddress, tokenAddress);
  console.log("WETH/Token Pair deployed to:", pairAddress);

  const Pair = await hre.ethers.getContractFactory("UniswapV2Pair");
  const pair = await Pair.deploy();
  await pair.waitForDeployment();
  const pairAddress = await pair.getAddress();
  console.log("Pair deployed to:", pairAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
