"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { ProofVerification } from "@/components/proof-verification";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/profile-storage";

export default function VerifyPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [isSecretProvided, setIsSecretProvided] = useState(false);

  useEffect(() => {
    // Load wallet address from profile
    const profile = getProfile();
    if (profile?.walletAddress) {
      setWalletAddress(profile.walletAddress);
    }
  }, []);

  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim()) {
      setTotpSecret(secretInput.trim());
      setIsSecretProvided(true);
    }
  };

  if (!isConnected) {
    router.push("/dashboard");
    return null;
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
          <h1 className="text-3xl font-bold">Verify Proof</h1>
          <p className="mt-2 text-muted-foreground">
            Test TOTP proof generation and verification
          </p>
        </div>
      </div>

      {!isSecretProvided ? (
        <Card>
          <CardHeader>
            <CardTitle>Enter TOTP Secret</CardTitle>
            <CardDescription>
              Enter your TOTP secret to generate and verify proofs. This is only
              used in your browser and is not stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSecretSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret">TOTP Secret</Label>
                <Input
                  id="secret"
                  type="password"
                  placeholder="Enter your TOTP secret"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This is the secret you received during TOTP setup (base32
                  encoded)
                </p>
              </div>
              <Button type="submit" className="w-full">
                Continue to Verification
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Test Proof Verification</CardTitle>
            <CardDescription>
              Generate a proof and verify it works correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProofVerification
              totpSecret={totpSecret}
              walletAddress={walletAddress}
            />
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zero-Knowledge Proofs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              ZK proofs allow you to prove you know the correct TOTP code
              without revealing the code itself or your secret. This provides
              privacy and security.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testing Purpose</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This page lets you test proof generation independently. In
              production, proof generation happens automatically when executing
              transactions.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Warning */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Security Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Never share your TOTP secret with anyone. The secret entered on this
            page is only used locally in your browser and is never transmitted
            or stored.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
