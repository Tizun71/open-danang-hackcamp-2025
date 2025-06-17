"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Droplets,
  TrendingUp,
  Users,
  Settings,
  ArrowUpRight,
  Zap,
  ChevronDown,
  Clock,
  PieChart,
  BarChart3,
  Wallet,
  DollarSign,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useAtom } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { useAccount, useWalletClient } from "wagmi";
import {
  getFactoryContract,
  getPairContract,
  getErc20Contract,
  getWETHContract,
} from "@/lib/contract";
import { getTokenList } from "@/lib/constants";
import { parseEther, formatEther } from "viem";
import { Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

export default function PoolUI() {
  const [sigpassAddress] = useAtom(addressAtom);
  const { data: walletClient } = useWalletClient();
  const { address: wagmiAddress, isConnected } = useAccount();
  const account = wagmiAddress || sigpassAddress;
  const [isLoaded, setIsLoaded] = useState(false);
  const [pools, setPools] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (walletClient) {
        try {
          const tokenList = await getTokenList();
          setTokens(tokenList);
          await loadPools();
        } catch (error) {
          console.error("Error loading data:", error);
        }
      }
      setIsLoaded(true);
    };
    loadData();
  }, [walletClient]);

  const loadPools = async () => {
    if (!walletClient) return;
    try {
      const factory = await getFactoryContract(walletClient);
      const pairLength = await factory.allPairsLength();

      const poolsData = [];
      for (let i = 0; i < pairLength; i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = await getPairContract(pairAddress);
        const token0Address = await pair.token0();
        const token1Address = await pair.token1();
        const reserves = await pair.getReserves();

        const token0Contract = await getErc20Contract(token0Address);
        const token1Contract = await getErc20Contract(token1Address);
        const token0Symbol = await token0Contract.symbol();
        const token1Symbol = await token1Contract.symbol();

        let userLiquidity = "0";
        if (account) {
          const balance = await pair.balanceOf(account);
          userLiquidity = formatEther(balance);
        }

        poolsData.push({
          tokenA: token0Symbol,
          tokenB: token1Symbol,
          pairAddress,
          token0Address,
          token1Address,
          apy: "0", // Would need additional data to calculate APY
          tvl: formatEther(reserves[0]) + " " + token0Symbol,
          volume24h: "0", // Would need indexer data for volume
          fee: "0.3",
          userLiquidity: "$" + userLiquidity,
          isHot: false,
        });
      }
      setPools(poolsData);
    } catch (error) {
      console.error("Error loading pools:", error);
    }
  };

  const handleCreatePool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!walletClient || !tokenA || !tokenB) return;

    setLoading(true);
    try {
      const factory = await getFactoryContract(walletClient);
      const tx = await factory.createPair(tokenA, tokenB);
      await tx.wait();

      await loadPools(); // Reload pools after creation

      // Reset form
      setTokenA("");
      setTokenB("");
    } catch (error) {
      console.error("Error creating pool:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!account || !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Liquidity Pools
        </h1>
        <p className="text-muted-foreground text-lg">
          Please connect your wallet to view and manage pools
        </p>
      </div>
    );
  }

  if (loading && !isLoaded) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Animated Header Section */}
      <div
        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all duration-700 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Liquidity Pools
          </h1>
          <p className="text-muted-foreground text-lg">
            Provide liquidity and earn rewards from trading fees
          </p>
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">Create Pool</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create Pool</DialogTitle>
                  <DialogDescription>
                    Create a new liquidity pool with two tokens
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePool}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-3">
                      <Label>Token A</Label>
                      <Select value={tokenA} onValueChange={setTokenA}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          {tokens.map((token) => (
                            <SelectItem
                              key={token.address}
                              value={token.address}
                            >
                              {token.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-3">
                      <Label>Token B</Label>
                      <Select value={tokenB} onValueChange={setTokenB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          {tokens.map((token) => (
                            <SelectItem
                              key={token.address}
                              value={token.address}
                            >
                              {token.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={
                        loading || !tokenA || !tokenB || tokenA === tokenB
                      }
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        "Create Pool"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Animated Pool Cards List */}
      <div className="space-y-6">
        {loading ? (
          <LoadingSpinner />
        ) : pools.length === 0 ? (
          <LoadingSpinner />
        ) : (
          pools.map((pool, index) => (
            <PoolCard
              key={pool.pairAddress}
              {...pool}
              index={index}
              isLoaded={isLoaded}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface PoolDetails {
  totalSupply: string;
  poolShare: string;
  tokenAReserve: string;
  tokenBReserve: string;
  volume7d: string;
  volume30d: string;
  feesEarned24h: string;
  feesEarned7d: string;
  impermanentLoss: string;
  lastUpdated: string;
  priceRange: string;
  liquidityProviders: number;
}

interface PoolCardProps {
  tokenA: string;
  tokenB: string;
  apy: string;
  tvl: string;
  volume24h: string;
  fee: string;
  userLiquidity: string;
  index: number;
  isLoaded: boolean;
  isHot?: boolean;
  details: PoolDetails;
  pairAddress: string;
  token0Address: string;
  token1Address: string;
}

function PoolCard({
  tokenA,
  tokenB,
  apy,
  tvl,
  volume24h,
  fee,
  userLiquidity,
  index,
  isLoaded,
  isHot = false,
  details,
  pairAddress,
  token0Address,
  token1Address,
}: PoolCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);
  const { data: walletClient } = useWalletClient();
  const { address: wagmiAddress } = useAccount();
  const [sigpassAddress] = useAtom(addressAtom);
  const account = wagmiAddress || sigpassAddress;

  const hasLiquidity = parseFloat(userLiquidity.replace("$", "")) > 0;

  const handleRemoveLiquidity = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!walletClient || !pairAddress || !account) return;

    setLoading(true);
    try {
      const pairContract = await getPairContract(pairAddress);
      const tx = await pairContract.burn(account);
      await tx.wait();
      // Reload pool data after removing liquidity
      window.location.reload();
    } catch (error) {
      console.error("Error removing liquidity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTokenGradient = (token: string) => {
    const gradients: Record<string, string> = {
      TB: "from-blue-500 to-blue-600",
      TA: "from-orange-500 to-orange-600",
      WETH: "from-green-500 to-green-600",
      USDT: "from-emerald-500 to-emerald-600",
    };
    return gradients[token] || "from-gray-500 to-gray-600";
  };

  return (
    <>
      <AddLiquidityDialog
        token0Address={token0Address}
        token1Address={token1Address}
        isOpen={isAddLiquidityOpen}
        onClose={() => setIsAddLiquidityOpen(false)}
      />
      <Card
        className={`
        group relative overflow-hidden border-0 shadow-md hover:shadow-2xl 
        transition-all duration-500 ease-out cursor-pointer
        ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        ${isHovered ? "scale-[1.01] -translate-y-1" : "scale-100 translate-y-0"}
        ${hasLiquidity ? "ring-2 ring-blue-200 ring-opacity-50" : ""}
       
      `}
        style={{
          animationDelay: `${index * 10}ms`,
          transitionDelay: isLoaded ? "0ms" : `${index * 10}ms`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated Background Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 transition-opacity duration-500`}
        />

        {/* Hot Pool Indicator */}
        {isHot && (
          <div className="absolute top-4 right-16 z-10">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              Hot
            </Badge>
          </div>
        )}

        {/* Expand/Collapse Indicator */}
        <div className="absolute top-4 right-4 z-10">
          <div
            className={`p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300`}
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
        </div>

        <CardContent className="relative p-8">
          {/* Main Card Content */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            {/* Left Section - Pool Identity */}
            <div className="flex items-center gap-6 min-w-0 flex-1">
              {/* Animated Token Icons */}
              <div className="relative flex items-center flex-shrink-0">
                <div
                  className={`
                  w-16 h-16 rounded-full bg-gradient-to-r ${getTokenGradient(
                    tokenA
                  )} 
                  flex items-center justify-center text-white text-xl font-bold 
                  shadow-lg transform transition-transform duration-300
                  ${isHovered ? "scale-110 rotate-3" : "scale-100 rotate-0"}
                `}
                >
                  {tokenA}
                </div>
                <div
                  className={`
                  w-16 h-16 rounded-full bg-gradient-to-r ${getTokenGradient(
                    tokenB
                  )} 
                  flex items-center justify-center text-white text-xl font-bold 
                  -ml-4 border-4 border-background shadow-lg transform transition-transform duration-300
                  ${isHovered ? "scale-110 -rotate-3" : "scale-100 rotate-0"}
                `}
                  style={{ transitionDelay: "50ms" }}
                >
                  {tokenB}
                </div>

                {/* Connecting Line Animation */}
                <div
                  className={`
                  absolute top-1/2 left-8 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 
                  transform -translate-y-1/2 transition-all duration-300
                  ${
                    isHovered
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-0"
                  }
                `}
                />
              </div>

              {/* Pool Information */}
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {tokenA}
                    <span className="text-gray-400 mx-1">/</span>
                    {tokenB}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={`
                    text-sm font-medium transition-all duration-300
                    ${isHovered ? "scale-105 bg-blue-100 text-blue-700" : ""}
                  `}
                  ></Badge>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center gap-2">
                  {hasLiquidity && (
                    <Badge
                      variant="outline"
                      className={`
                      text-xs text-blue-600 border-blue-200 bg-blue-50 
                      transition-all duration-300
                      ${isHovered ? "scale-105 shadow-sm" : ""}
                    `}
                    >
                      <Droplets className="w-3 h-3 mr-1" />
                      Active Position
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Section - Animated Stats Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 flex-1 items-end justify-end">
              {[
                {},
                {},
                {
                  icon: null,
                  label: "Your Liquidity",
                  value: userLiquidity.slice(0, 7),
                  color: hasLiquidity ? "text-blue-600" : "text-gray-500",
                },
              ].map((stat, statIndex) => (
                <div
                  key={stat.label}
                  className={`
                  text-center xl:text-left p-3 rounded-lg transition-all duration-300`}
                  style={{ transitionDelay: `${statIndex * 50}ms` }}
                >
                  <div className="flex items-center justify-center xl:justify-start gap-2 text-muted-foreground text-sm mb-2">
                    {stat.icon && <stat.icon className="w-4 h-4" />}
                    {stat.label}
                  </div>
                  <div
                    className={`
                    font-bold text-lg ${stat.color} transition-all duration-300
                    ${stat.highlight && isHovered ? "scale-110" : "scale-100"}
                  `}
                  >
                    {stat.value}
                    {stat.highlight && isHovered && (
                      <ArrowUpRight className="w-4 h-4 inline-block ml-1 animate-bounce" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-col sm:flex-row xl:flex-col gap-3 flex-shrink-0">
              <Button
                className={`
                group/btn relative overflow-hidden transition-all duration-300
                ${hasLiquidity ? "variant-outline" : ""}
                ${isHovered ? "scale-105 shadow-lg" : "scale-100"}
              `}
                variant={hasLiquidity ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddLiquidityOpen(true);
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                <Plus className="w-4 h-4 mr-2 relative z-10 group-hover/btn:rotate-90 transition-transform duration-300" />
                <span className="relative z-10">Add Liquidity</span>
              </Button>

              {hasLiquidity && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`
                    transition-all duration-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600
                    ${isHovered ? "scale-105" : "scale-100"}
                  `}
                    onClick={handleRemoveLiquidity}
                    disabled={loading}
                  >
                    {loading ? "Removing..." : "Remove Liquidity"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Details Section */}
          <div
            className={`
            overflow-hidden transition-all duration-500 ease-in-out
           
          `}
          >
            <Separator className="mb-6" />

            <div className="space-y-6"></div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AddLiquidityDialog({
  token0Address,
  token1Address,
  isOpen,
  onClose,
}: {
  token0Address: string;
  token1Address: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [sigpassAddress] = useAtom(addressAtom);
  const { data: walletClient } = useWalletClient();
  const { address: wagmiAddress } = useAccount();
  const account = wagmiAddress || sigpassAddress;
  const { toast } = useToast();
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairAddress, setPairAddress] = useState(null);
  const [reserves, setReserves] = useState([BigInt(0), BigInt(0)]);
  const [token0Symbol, setToken0Symbol] = useState("");
  const [token1Symbol, setToken1Symbol] = useState("");
  const loadTokensAndPair = async () => {
    if (!walletClient || !token0Address || !token1Address) return;

    try {
      const token0Contract = await getErc20Contract(token0Address);
      const token1Contract = await getErc20Contract(token1Address);
      setToken0Symbol(await token0Contract.symbol());
      setToken1Symbol(await token1Contract.symbol());

      const factory = await getFactoryContract(walletClient);
      const pair = await factory.getPair(token0Address, token1Address);
      setPairAddress(pair);

      if (pair !== "0x0000000000000000000000000000000000000000") {
        const pairContract = await getPairContract(pair);
        const res = await pairContract.getReserves();
        setReserves([res[0], res[1]]);
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
  useEffect(() => {
    loadTokensAndPair();
  }, [walletClient, token0Address, token1Address]);

  const handleAddLiquidity = async () => {
    if (!walletClient || !amount0 || !amount1 || !account) {
      toast({
        title: "Error",
        description: "Please enter amounts",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const amount0Wei = parseEther(amount0);
      const amount1Wei = parseEther(amount1);

      // Approve token1
      await approveToken(token1Address, pairAddress!, amount1Wei);

      // Transfer tokens to pair
      await transferWETH(token0Address, pairAddress!, amount0Wei);
      await transferToken(token1Address, pairAddress!, amount1Wei);

      // Mint LP tokens
      const pairContract = await getPairContract(pairAddress!);
      const tx = await pairContract.mint(account);
      await tx.wait();
      loadTokensAndPair();
      toast({
        title: "Success",
        description: "Liquidity added successfully",
      });
      onClose();
      window.location.reload();
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
    pairAddress: string,
    amount: bigint
  ) => {
    if (!walletClient || !account) return;
    try {
      const tokenContract = await getErc20Contract(tokenAddress);
      const tx = await tokenContract.transfer(pairAddress, amount);
      await tx.wait();
    } catch (error) {
      console.error("Error transferring token:", error);
      throw error;
    }
  };

  const transferWETH = async (
    tokenAddress: string,
    pairAddress: string,
    amount: bigint
  ) => {
    if (!walletClient || !account) return;
    try {
      const tokenContract = await getWETHContract(tokenAddress);
      const tx = await tokenContract.transfer(pairAddress, amount);
      await tx.wait();
    } catch (error) {
      console.error("Error transferring WETH:", error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Liquidity</DialogTitle>
          <DialogDescription>
            Add liquidity to {token0Symbol}/{token1Symbol} pool
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount0">{token0Symbol} Amount</Label>
            <Input
              id="amount0"
              type="number"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              placeholder="0.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount1">{token1Symbol} Amount</Label>
            <Input
              id="amount1"
              type="number"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              placeholder="0.0"
            />
          </div>

          {pairAddress && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Pool Info</h3>
              <p className="text-sm text-gray-600">
                {token0Symbol} Reserve: {formatEther(reserves[0])}
              </p>
              <p className="text-sm text-gray-600">
                {token1Symbol} Reserve: {formatEther(reserves[1])}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLiquidity}
            disabled={loading || !amount0 || !amount1}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Adding...
              </div>
            ) : (
              "Add Liquidity"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
