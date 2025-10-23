"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { TransactionExecution } from "@/components/transaction-execution";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile } from "@/lib/profile-storage";

export default function ExecutePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);

  useEffect(() => {
    // Load wallet address from profile
    const profile = getProfile();
    if (!profile?.walletAddress) {
      // Redirect to deploy if no wallet found
      router.push("/dashboard/deploy");
      return;
    }

    setWalletAddress(profile.walletAddress);
  }, [router]);

  if (!isConnected) {
    router.push("/dashboard");
    return null;
  }

  if (!walletAddress) {
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
          <h1 className="text-3xl font-bold">Execute Transaction</h1>
          <p className="mt-2 text-muted-foreground">
            Execute transactions from your TOTP-protected smart wallet
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Smart Wallet Information</CardTitle>
          <CardDescription>Your deployed wallet details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <span className="text-sm text-muted-foreground">
              Wallet Address
            </span>
            <code className="rounded bg-background px-2 py-1 text-sm">
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "—"}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execute Transaction</CardTitle>
          <CardDescription>
            Send transactions using TOTP verification with zero-knowledge proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionExecution walletAddress={walletAddress} />
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TOTP Authentication</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Each transaction requires a valid TOTP code from your
              authenticator app. The code is verified using zero-knowledge
              proofs, ensuring your secret remains private.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Flow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              1. Enter transaction details
              <br />
              2. Provide current TOTP code
              <br />
              3. Generate ZK proof
              <br />
              4. Submit transaction with proof
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Always verify the destination address before confirming
            transactions
          </p>
          <p>• Use a fresh TOTP code for each transaction</p>
          <p>
            • Keep your authenticator app secure and backed up with recovery
            codes
          </p>
          <p>• Monitor your wallet activity regularly</p>
        </CardContent>
      </Card>
    </div>
  );
}
