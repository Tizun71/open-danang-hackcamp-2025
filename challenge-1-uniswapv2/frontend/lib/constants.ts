import { getErc20Contract, getWETHContract } from "./contract";

export const FACTORY_ADDRESS = '0xa51308D94b0874524A71cB9569CF4f46648Ba409';
export const WETH_ADDRESS = '0x8775e0d58e441C499Af886585EdA3BE5Eef4B974';
export const TKA_ADDRESS = '0xCf166c0fB28C284bc4DAe2b719767748CCC327aa';
export const UNI_ADDRESS = '0xE4517D97c50005B07d0d6BFA1f702eA118a12Dd7';
export const TZ_ADDRESS = '0x0bc8C054127afEcfA4512966b934B6bb5781a15C';
export const PAIR_ADDRESS = '0x72f11abe4413f5e14575F07624ce81ee9df946d4';

async function getSymbolToken(address: string) {
  const token = await getErc20Contract(address);
  return await token.symbol();
}

async function getNameToken(address: string) {
  const token = await getErc20Contract(address);
  return await token.name();
}

async function getSymbolWETH(address: string) {
  const token = await getWETHContract(address);
  return await token.symbol();
}

async function getNameWETH(address: string) {
  const token = await getWETHContract(address);
  return await token.name();
}

export async function getTokenList() {
  const tokens = [
    {
      address: TKA_ADDRESS,
      decimals: 18,
    },
    {
      address: UNI_ADDRESS,
      decimals: 18,
    },
    {
      address: TZ_ADDRESS,
      decimals: 18,
    },
  ];

  const result = await Promise.all(tokens.map(async (t) => {
    const symbol = await getSymbolToken(t.address);
    const name = await getNameToken(t.address);
    return {
      ...t,
      name,
      symbol,
    };
  }));

   result.push({address: WETH_ADDRESS, decimals: 18, name: await getNameWETH(WETH_ADDRESS), symbol: await getSymbolWETH(WETH_ADDRESS) });

   return result;
}