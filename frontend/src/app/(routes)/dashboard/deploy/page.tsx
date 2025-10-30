"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WalletDeployment } from "@/components/wallet-deployment";
import { WalletFunding } from "@/components/wallet-funding";
import { getProfile, saveProfile } from "@/lib/profile-storage";

export default function DeployPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [secretHash, setSecretHash] = useState<bigint | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedWalletAddress, setDeployedWalletAddress] =
    useState<Address | null>(null);

  useEffect(() => {
    // Load secret hash from profile
    const profile = getProfile();
    if (!profile?.secretHash) {
      // Redirect to setup if no hash found
      router.push("/dashboard/setup");
      return;
    }

    setSecretHash(BigInt(profile.secretHash));

    // Check if wallet is already deployed
    if (profile.walletAddress) {
      setDeployedWalletAddress(profile.walletAddress as Address);
      setIsDeployed(true);
    }
  }, [router]);

  const handleWalletDeployed = (walletAddress: Address) => {
    // Save wallet address to profile
    saveProfile({
      walletAddress,
      ownerAddress: address || null,
    });

    setDeployedWalletAddress(walletAddress);
    setIsDeployed(true);
  };

  if (!isConnected) {
    router.push("/dashboard");
    return null;
  }

  if (!secretHash) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Deploy Wallet</h1>
          <p className="mt-2 text-muted-foreground">
            Deploy your TOTP-protected smart wallet to the blockchain
          </p>
        </div>
      </div>

      {isDeployed && deployedWalletAddress ? (
        <div className="space-y-6">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">
                ✓ Deployment Complete
              </CardTitle>
              <CardDescription>
                Your smart wallet has been deployed successfully at{" "}
                <code className="text-xs">
                  {deployedWalletAddress.slice(0, 6)}...
                  {deployedWalletAddress.slice(-4)}
                </code>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                You can add more funds to your wallet or continue to execute
                transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletFunding walletAddress={deployedWalletAddress} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => router.push("/dashboard/execute")}>
              Continue to Transactions
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Deploy Smart Wallet</CardTitle>
            <CardDescription>
              Deploy your TOTP-protected smart wallet contract
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletDeployment
              secretHash={secretHash}
              onDeployed={handleWalletDeployed}
            />
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      {!isDeployed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                What is a Smart Wallet?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                A smart wallet is a smart contract that can hold assets and
                execute transactions. This wallet uses TOTP verification for
                enhanced security through zero-knowledge proofs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gas Costs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Deploying the wallet requires a one-time gas fee. Make sure your
                connected wallet has sufficient ETH to cover the deployment
                cost.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
