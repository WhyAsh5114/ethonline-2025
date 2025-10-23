"use client";

import {
  IconCopy,
  IconDotsVertical,
  IconExternalLink,
  IconLogout,
  IconWallet,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function NavUser() {
  const { isMobile } = useSidebar();
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
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-14 w-full" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10">
                  <IconWallet className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-mono text-xs font-medium">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {chain?.name || "Unknown Network"}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10">
                    <IconWallet className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Connected Wallet</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {chain?.name || "Unknown Network"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 px-2 py-2">
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Address
                </div>
                <code className="break-all text-xs font-mono">{address}</code>
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
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleCopyAddress}>
                <IconCopy />
                Copy Address
              </DropdownMenuItem>
              {chain?.blockExplorers && (
                <DropdownMenuItem onClick={handleViewExplorer}>
                  <IconExternalLink />
                  View in Explorer
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="text-destructive"
            >
              <IconLogout />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
