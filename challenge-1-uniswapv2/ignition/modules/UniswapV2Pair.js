const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const UniswapV2PairModule = buildModule("UniswapV2PairModule", (m) => {
  const factory = m.contractAt(
    "UniswapV2Factory",
    "0xa51308D94b0874524A71cB9569CF4f46648Ba409"
  );
  const weth = m.contractAt(
    "WETH",
    "0x8775e0d58e441C499Af886585EdA3BE5Eef4B974"
  );
  const token = m.contractAt(
    "UniswapV2ERC20",
    "0xCf166c0fB28C284bc4DAe2b719767748CCC327aa"
  );

  const pair = m.call(factory, "createPair", [token.address, weth.address]);

  return {
    pair,
  };
});

module.exports = UniswapV2PairModule;
