"use client";

import { Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function WalletDetails() {
  const { address, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const router = useRouter();

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
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

  const handleDisconnect = () => {
    disconnect();
    sessionStorage.removeItem("totp_configured");
    router.push("/dashboard");
  };

  if (!address) {
    return <Skeleton className="h-10 w-40" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary/10 text-xs">
              <Wallet className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Connected Wallet</p>
            <p className="text-xs text-muted-foreground">
              {chain?.name || "Unknown Network"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Address
            </div>
            <code className="text-xs font-mono">{address}</code>
          </div>
          {balance && (
            <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Balance
              </div>
              <div className="text-sm font-medium">
                {Number(balance.formatted).toFixed(4)} {balance.symbol}
              </div>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        {chain?.blockExplorers && (
          <DropdownMenuItem onClick={handleViewExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Explorer
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDisconnect}
          className="text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
