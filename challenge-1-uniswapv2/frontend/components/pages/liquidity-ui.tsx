import {
  getFactoryContract,
  getPairContract,
  getErc20Contract,
  getWETHContract,
} from "@/lib/contract";
import { ethers } from "ethers";
import { getTokenList } from "@/lib/constants";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { addressAtom } from "@/components/sigpasskit";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LiquidityUI() {
  const [sigpassAddress] = useAtom(addressAtom);
  const { data: walletClient } = useWalletClient();
  const { address: wagmiAddress, isConnected } = useAccount();
  const account = wagmiAddress || sigpassAddress;
  const { toast } = useToast();
  const [tokens, setTokens] = useState([]);
  const [selectedToken0, setSelectedToken0] = useState(null);
  const [selectedToken1, setSelectedToken1] = useState(null);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairAddress, setPairAddress] = useState(null);
  const [reserves, setReserves] = useState([BigInt(0), BigInt(0)]);

  // Load tokens when wallet is connected
  useEffect(() => {
    const loadTokens = async () => {
      if (walletClient) {
        try {
          const tokenList = await getTokenList();
          setTokens(tokenList);
        } catch (error) {
          console.error("Error loading tokens:", error);
          toast({
            title: "Error",
            description: "Failed to load tokens",
            variant: "destructive",
          });
        }
      }
    };
    loadTokens();
  }, [walletClient]);

  // Load pair address when both tokens are selected
  useEffect(() => {
    const loadPair = async () => {
      if (selectedToken0 && selectedToken1 && walletClient) {
        await loadPairAddress();
      }
    };
    loadPair();
  }, [selectedToken0, selectedToken1, walletClient]);

  // Load reserves when pair address changes
  useEffect(() => {
    const loadPairReserves = async () => {
      if (
        pairAddress &&
        pairAddress !== "0x0000000000000000000000000000000000000000"
      ) {
        await loadReserves(pairAddress);
      }
    };
    loadPairReserves();
  }, [pairAddress, walletClient]);

  const loadPairAddress = async () => {
    if (!walletClient) return;
    try {
      const factory = await getFactoryContract(walletClient);
      const pairLength = await factory.allPairsLength();

      console.log("Total pairs:", pairLength.toString());

      const pair = await factory.getPair(
        selectedToken0.address,
        selectedToken1.address
      );

      console.log("Pair address:", pair);

      setPairAddress(pair);
      if (pair !== "0x0000000000000000000000000000000000000000") {
        loadReserves(pair);
      }
    } catch (error) {
      console.error("Error loading pair:", error);
      toast({
        title: "Error",
        description: "Failed to load trading pair",
        variant: "destructive",
      });
    }
  };

  const loadReserves = async (pair: string) => {
    if (!walletClient) return;
    try {
      const contract = await getPairContract(pair);
      const res = await contract.getReserves();
      console.log("Reserves:", res);
      setReserves([res[0], res[1]]);
    } catch (error) {
      console.error("Error loading reserves:", error);
    }
  };
  const approveToken = async (
    tokenAddress: string,
    spender: string,
    amount: bigint
  ) => {
    if (!walletClient || !account) return;
    try {
      const tokenContract = await getErc20Contract(tokenAddress);
      const tx = await tokenContract.approve(spender, amount);
      await tx.wait();
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const transferToken = async (
    tokenAddress: string,
    pairContract: string,
    amount: bigint
  ) => {
    if (!walletClient || !account) return;
    try {
      const tokenContract = await getErc20Contract(tokenAddress);
      const tx = await tokenContract.transfer(pairContract, amount);
      await tx.wait();
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const transferWETH = async (
    tokenAddress: string,
    pairContract: string,
    amount: bigint
  ) => {
    if (!walletClient || !account) return;
    try {
      const tokenContract = await getWETHContract(tokenAddress);
      const tx = await tokenContract.transfer(pairContract, amount);
      await tx.wait();
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const handleAddLiquidity = async () => {
    if (!walletClient || !amount0 || !amount1 || !account) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter amounts",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      if (!pairAddress) {
        // Create pair if it doesn't exist
        const factory = getFactoryContract(walletClient);
        await factory.createPair(
          selectedToken0.address,
          selectedToken1.address
        );
        await loadPairAddress();
      }

      const amount0Wei = parseEther(amount0);
      const amount1Wei = parseEther(amount1);

      // Approve tokens
      await approveToken(selectedToken1.address, pairAddress!, amount1Wei);

      await transferWETH(selectedToken0.address, pairAddress!, amount0Wei);
      await transferToken(selectedToken1.address, pairAddress!, amount1Wei);

      const pairContract = await getPairContract(pairAddress!);
      const tx = await pairContract.mint(account);
      await tx.wait();

      // Reload reserves
      await loadReserves(pairAddress!);
      setAmount0("");
      setAmount1("");
      toast({
        title: "Success",
        description: "Liquidity added successfully",
      });
    } catch (error) {
      console.error("Error adding liquidity:", error);
      toast({
        title: "Error",
        description: "Failed to add liquidity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!walletClient || !pairAddress || !account) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const pairContract = await getPairContract(pairAddress);
      const tx = await pairContract.burn(account);
      await tx.wait();
      await loadReserves(pairAddress);
      toast({
        title: "Success",
        description: "Liquidity removed successfully",
      });
    } catch (error) {
      console.error("Error removing liquidity:", error);
      toast({
        title: "Error",
        description: "Failed to remove liquidity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!account || !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <h2 className="text-xl font-bold">Connect Wallet</h2>
        <p>Please connect your wallet to manage liquidity.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-6">Manage Liquidity</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Token 1</label>
          <div className="flex gap-2">
            {tokens.length > 0 && (
              <Select
                value={selectedToken0?.address || ""}
                onValueChange={(value) =>
                  setSelectedToken0(tokens.find((t) => t.address === value))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              type="number"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              placeholder="0.0"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Token 2</label>
          <div className="flex gap-2">
            {tokens.length > 0 && (
              <Select
                value={selectedToken1?.address || ""}
                onValueChange={(value) =>
                  setSelectedToken1(tokens.find((t) => t.address === value))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="number"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              placeholder="0.0"
              className="flex-1"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Pool Info</h3>
          <p className="text-sm text-gray-600">
            Pair Address: {pairAddress || "No pair found"}
          </p>
          {selectedToken0 && selectedToken1 && (
            <div>
              <p className="text-sm text-gray-600">
                {selectedToken0.symbol} Reserve: {formatEther(reserves[0])}
              </p>
              <p className="text-sm text-gray-600">
                {selectedToken1.symbol} Reserve: {formatEther(reserves[1])}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAddLiquidity}
            disabled={loading || !amount0 || !amount1}
            className="flex-1"
          >
            {loading ? "Adding..." : "Add Liquidity"}
          </Button>
          {pairAddress && (
            <Button
              onClick={handleRemoveLiquidity}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? "Removing..." : "Remove Liquidity"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
