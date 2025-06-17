"use client";

import {
  getErc20Contract,
  getFactoryContract,
  getPairContract,
  getWETHContract,
} from "@/lib/contract";
import { getTokenList } from "@/lib/constants";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { addressAtom } from "@/components/sigpasskit";
import { useAccount, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseEther, formatEther } from "viem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpDown,
  Wallet,
  Info,
  Loader2,
  TrendingUp,
  Coins,
} from "lucide-react";

export default function SwapUI() {
  const [sigpassAddress] = useAtom(addressAtom);
  const { data: walletClient } = useWalletClient();
  const { address: wagmiAddress, isConnected } = useAccount();
  const account = wagmiAddress || sigpassAddress;
  const { toast } = useToast();
  const [tokens, setTokens] = useState([]);
  const [selectedTokenIn, setSelectedTokenIn] = useState(null);
  const [selectedTokenOut, setSelectedTokenOut] = useState(null);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [reserves, setReserves] = useState([BigInt(0), BigInt(0)]);
  const [pairAddress, setPairAddress] = useState(null);

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
      if (selectedTokenIn && selectedTokenOut && walletClient) {
        try {
          const factory = await getFactoryContract(walletClient);
          const pair = await factory.getPair(
            selectedTokenIn.address,
            selectedTokenOut.address
          );
          setPairAddress(pair);

          if (pair !== "0x0000000000000000000000000000000000000000") {
            await loadReserves(pair);
          } else {
            setReserves([BigInt(0), BigInt(0)]);
          }
        } catch (error) {
          console.error("Error loading pair:", error);
          toast({
            title: "Error",
            description: "Failed to load trading pair",
            variant: "destructive",
          });
        }
      }
    };
    loadPair();
  }, [selectedTokenIn, selectedTokenOut, walletClient]);

  const loadReserves = async (pair: string) => {
    if (!walletClient) return;
    try {
      const contract = await getPairContract(pair);
      const res = await contract.getReserves();
      console.log("Reserves:", res);
      setReserves([res[0], res[1]]);
    } catch (error) {
      console.error("Error loading reserves:", error);
      toast({
        title: "Error",
        description: "Failed to load reserves",
        variant: "destructive",
      });
    }
  };

  const calculateOutputAmount = (input: string) => {
    if (
      !input ||
      !selectedTokenIn ||
      !selectedTokenOut ||
      reserves[0] === BigInt(0) ||
      reserves[1] === BigInt(0)
    ) {
      setAmountOut("");
      return;
    }

    try {
      const inputAmount = parseEther(input);
      let outputAmount;
      if (selectedTokenIn.address < selectedTokenOut.address) {
        outputAmount =
          (inputAmount * reserves[1]) / (reserves[0] + inputAmount);
      } else {
        outputAmount =
          (inputAmount * reserves[0]) / (reserves[1] + inputAmount);
      }
      setAmountOut(formatEther(outputAmount));
    } catch (error) {
      console.error("Calculation error:", error);
      setAmountOut("");
    }
  };

  const getBalance = async (owner: string) => {
    console.log("Get Balance for:", owner);
    console.log(owner);
    if (!walletClient || !account) return;
    try {
      const wethContract = await getErc20Contract(
        "0x8775e0d58e441C499Af886585EdA3BE5Eef4B974"
      );
      const tx = await wethContract.balanceOf(owner);
      console.log("Balance Token:", await tx);

      const tokenContract = await getErc20Contract(
        "0xCf166c0fB28C284bc4DAe2b719767748CCC327aa"
      );
      const tx1 = await tokenContract.balanceOf(owner);
      console.log("Balance Token:", await tx1);
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const handleSwap = async () => {
    if (
      !walletClient ||
      !amountIn ||
      !pairAddress ||
      !account ||
      !selectedTokenIn ||
      !selectedTokenOut
    ) {
      toast({
        title: "Error",
        description:
          "Please connect your wallet, select tokens and enter an amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const contract = await getPairContract(pairAddress);

      const inputAmount = parseEther(amountIn);
      const outputAmount = parseEther(amountOut);
      const reserves = await contract.getReserves();
      console.log("Reserves before swap:", reserves[0], reserves[1]);
      await getBalance(pairAddress);
      console.log("outputAmount:", outputAmount);

      const transferContract = await getWETHContract(selectedTokenIn.address);
      await transferContract.transfer(pairAddress, inputAmount);
      await contract.swap(0, outputAmount, account, "0x");

      await loadReserves(pairAddress);
      setAmountIn("");
      setAmountOut("");

      toast({
        title: "Success",
        description: "Swap completed successfully",
      });
    } catch (error) {
      console.error("Swap error:", error);
      toast({
        title: "Error",
        description: "Swap failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Prevent render if no wallet
  if (!account || !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Connect Wallet
              </h2>
              <p className="text-gray-600">
                Please connect your wallet to start swapping tokens.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br flex justify-center mt-3">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="space-y-6">
          {/* From Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                You Pay
              </label>
              <Badge variant="secondary" className="text-xs">
                From
              </Badge>
            </div>
            <div className="relative">
              <div className="flex gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                {tokens.length > 0 && (
                  <Select
                    value={selectedTokenIn?.address || ""}
                    onValueChange={(value) =>
                      setSelectedTokenIn(
                        tokens.find((t) => t.address === value)
                      )
                    }
                  >
                    <SelectTrigger className="w-[120px] border-0 bg-white shadow-sm">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="number"
                  value={amountIn}
                  onChange={(e) => {
                    setAmountIn(e.target.value);
                    calculateOutputAmount(e.target.value);
                  }}
                  placeholder="0.0"
                  className="flex-1 border-0 bg-transparent text-lg font-semibold placeholder:text-gray-400 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Swap Direction Indicator */}
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <ArrowUpDown className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* To Token Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                You Receive
              </label>
              <Badge variant="secondary" className="text-xs">
                To
              </Badge>
            </div>
            <div className="relative">
              <div className="flex gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                {tokens.length > 0 && (
                  <Select
                    value={selectedTokenOut?.address || ""}
                    onValueChange={(value) =>
                      setSelectedTokenOut(
                        tokens.find((t) => t.address === value)
                      )
                    }
                  >
                    <SelectTrigger className="w-[120px] border-0 bg-white shadow-sm">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full" />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="number"
                  value={amountOut}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 border-0 bg-transparent text-lg font-semibold placeholder:text-gray-400 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pool Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">
                Pool Information
              </h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pair Address:</span>
                <span className="font-mono text-xs text-gray-800 bg-white px-2 py-1 rounded">
                  {pairAddress
                    ? `${pairAddress.slice(0, 6)}...${pairAddress.slice(-4)}`
                    : "No pair found"}
                </span>
              </div>

              {selectedTokenIn && selectedTokenOut && (
                <div className="space-y-2 pt-2 border-t border-blue-200">
                  {selectedTokenIn.address < selectedTokenOut.address ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedTokenIn.symbol} Reserve:
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatEther(reserves[0])}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedTokenOut.symbol} Reserve:
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatEther(reserves[1])}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedTokenIn.symbol} Reserve:
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatEther(reserves[1])}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedTokenOut.symbol} Reserve:
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatEther(reserves[0])}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={
              loading || !amountIn || !selectedTokenIn || !selectedTokenOut
            }
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Swapping...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Swap Tokens
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
