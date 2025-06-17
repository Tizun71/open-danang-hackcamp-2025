import { getContract, WalletClient } from 'viem';
import { FACTORY_ADDRESS } from './constants';
import factoryABI  from '../abis/UniswapV2Factory.json';
import pairABI from '../abis/UniswapV2Pair.json';
import erc20ABI from '../abis/UniswapV2ERC20.json';
import WETHABI from '../abis/WETH.json';
import { ethers } from "ethers";

export async function getFactoryContract(walletClient: WalletClient) {
  const ethereum = (window as any).ethereum;
  const prov = new ethers.BrowserProvider(ethereum);
  const signer = await prov.getSigner();
  return new ethers.Contract(
    FACTORY_ADDRESS,
    factoryABI.abi,
    signer,
  );
}

export async function getPairContract(pairAddress: string) {
  const ethereum = (window as any).ethereum;
  const prov = new ethers.BrowserProvider(ethereum);
  const signer = await prov.getSigner();
  console.log(signer);
  return new ethers.Contract(
    pairAddress,
    pairABI.abi,
    signer,
  );
}

export async function getErc20Contract(tokenAddress: string) {
  const ethereum = (window as any).ethereum;
  const prov = new ethers.BrowserProvider(ethereum);
  const signer = await prov.getSigner();
  return new ethers.Contract(
    tokenAddress,
    erc20ABI.abi,
    signer,
  );
}

export async function getWETHContract(tokenAddress: string) {
  const ethereum = (window as any).ethereum;
  const prov = new ethers.BrowserProvider(ethereum);
  const signer = await prov.getSigner();
  return new ethers.Contract(
    tokenAddress,
    WETHABI.abi,
    signer,
  );
}