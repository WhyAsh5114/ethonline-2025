"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function WalletConnect() {
  const { connectors, connect, isPending, error } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    null,
  );

  const handleConnect = (connectorId: string) => {
    setSelectedConnector(connectorId);
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const handleViewExplorer = () => {
    if (address && chain) {
      const explorerUrl = chain.blockExplorers?.default?.url;
      if (explorerUrl) {
        window.open(`${explorerUrl}/address/${address}`, "_blank");
      }
    }
  };

  if (isConnected && address) {
    return (
      <Card data-slot="wallet-connected" className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Wallet Connected</CardTitle>
              <CardDescription className="text-xs">
                {chain?.name || "Unknown Network"}
              </CardDescription>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Address
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </code>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopyAddress}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {chain?.blockExplorers && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleViewExplorer}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {balance && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Balance
                </div>
                <div className="text-sm font-medium">
                  {Number(balance.formatted).toFixed(4)} {balance.symbol}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <Button
            variant="destructive"
            onClick={() => disconnect()}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-slot="wallet-connect">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Choose a wallet to start using ChronoVault
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
              isPending && selectedConnector === connector.id && "opacity-50",
            )}
            onClick={() => handleConnect(connector.id)}
            disabled={isPending}
          >
            {isPending && selectedConnector === connector.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            <span className="flex-1 font-medium">{connector.name}</span>
          </Button>
        ))}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
