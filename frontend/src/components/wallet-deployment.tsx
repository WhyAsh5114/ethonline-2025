"use client";

import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Address, isAddress } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTOTPWallet } from "@/hooks/use-totp-wallet";
import {
  DEFAULT_NETWORK,
  getContractAddresses,
} from "@/lib/contract-addresses";

interface WalletDeploymentProps {
  secretHash: bigint | null;
  onDeployed?: (walletAddress: Address) => void;
}

export function WalletDeployment({
  secretHash,
  onDeployed,
}: WalletDeploymentProps) {
  const { address: userAddress, isConnected, chain } = useAccount();
  const { deployWallet, isDeploying } = useTOTPWallet();

  const [entryPointAddress, setEntryPointAddress] = useState<string>("");
  const [verifierAddress, setVerifierAddress] = useState<string>("");
  const [deployedWallet, setDeployedWallet] = useState<Address | null>(null);

  // Load default addresses on mount
  useEffect(() => {
    const addresses = getContractAddresses(DEFAULT_NETWORK);
    if (addresses.entryPoint) {
      setEntryPointAddress(addresses.entryPoint);
    }
    if (addresses.verifier) {
      setVerifierAddress(addresses.verifier);
    }
  }, []);

  const handleDeploy = async () => {
    if (!isConnected || !userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!chain) {
      toast.error("Please ensure your wallet is connected to a network");
      return;
    }

    if (chain.id !== 11155111 && chain.id !== 31337) {
      toast.error("Please switch to Sepolia testnet or Hardhat network");
      return;
    }

    if (!secretHash) {
      toast.error("Please set up TOTP first");
      return;
    }

    if (!isAddress(entryPointAddress)) {
      toast.error("Invalid EntryPoint address");
      return;
    }

    if (!isAddress(verifierAddress)) {
      toast.error("Invalid Verifier address");
      return;
    }

    try {
      const walletAddress = await deployWallet({
        entryPointAddress: entryPointAddress as Address,
        verifierAddress: verifierAddress as Address,
        ownerAddress: userAddress,
        initialSecretHash: secretHash,
      });

      if (walletAddress) {
        setDeployedWallet(walletAddress);
        toast.success("Wallet deployed successfully!");
        onDeployed?.(walletAddress);
      }
    } catch (error) {
      console.error("Failed to deploy wallet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deploy wallet",
      );
    }
  };

  if (deployedWallet) {
    return (
      <Card data-slot="wallet-deployed" className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Wallet Deployed</CardTitle>
              <CardDescription>
                Your TOTP wallet is ready to use
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wallet Address</Label>
            <div className="flex items-center gap-2">
              <Input value={deployedWallet} readOnly className="font-mono" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deployedWallet);
                  toast.success("Address copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-slot="wallet-deployment">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>Deploy TOTP Wallet</CardTitle>
            <CardDescription>
              Deploy a new smart contract wallet with TOTP authentication
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                Wallet Not Connected
              </p>
              <p className="mt-1 text-muted-foreground">
                Please connect your wallet to deploy a TOTP wallet.
              </p>
            </div>
          </div>
        )}

        {isConnected &&
          chain &&
          chain.id !== 11155111 &&
          chain.id !== 31337 && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground">Wrong Network</p>
                <p className="mt-1 text-muted-foreground">
                  Please switch to Sepolia testnet (Chain ID: 11155111) to
                  deploy.
                </p>
              </div>
            </div>
          )}

        {!secretHash && isConnected && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">TOTP Setup Required</p>
              <p className="mt-1 text-muted-foreground">
                Please set up your TOTP authenticator first before deploying the
                wallet.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="entrypoint">EntryPoint Address</Label>
          <Input
            id="entrypoint"
            placeholder="0x..."
            value={entryPointAddress}
            onChange={(e) => setEntryPointAddress(e.target.value)}
            disabled={isDeploying || !secretHash}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            The ERC-4337 EntryPoint contract address
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verifier">TOTPVerifier Address</Label>
          <Input
            id="verifier"
            placeholder="0x..."
            value={verifierAddress}
            onChange={(e) => setVerifierAddress(e.target.value)}
            disabled={isDeploying || !secretHash}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            The ZK proof verifier contract address
          </p>
        </div>

        {userAddress && (
          <div className="space-y-2">
            <Label>Owner Address</Label>
            <Input
              value={userAddress}
              readOnly
              className="font-mono text-muted-foreground"
            />
          </div>
        )}

        {secretHash && (
          <div className="space-y-2">
            <Label>Secret Hash</Label>
            <Input
              value={secretHash.toString()}
              readOnly
              className="font-mono text-muted-foreground"
            />
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleDeploy}
          disabled={isDeploying || !secretHash || !userAddress}
          className="w-full"
        >
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying Wallet...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Deploy Wallet
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
