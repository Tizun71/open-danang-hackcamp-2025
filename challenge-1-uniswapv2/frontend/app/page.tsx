"use client";

import { Header } from "@/components/common/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SwapUI from "@/components/pages/swap-ui";
import LiquidityUI from "@/components/pages/liquidity-ui";
import PoolUI from "@/components/pages/pool-ui";

export default function Home() {
  return (
    <div className="flex bg-background">
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="container mx-auto max-w-7xl">
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="swap">Swap</TabsTrigger>
                <TabsTrigger value="pool">Liquidity Pool</TabsTrigger>
              </TabsList>
              <TabsContent value="swap">
                <SwapUI />
              </TabsContent>
              <TabsContent value="pool">
                <PoolUI />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
