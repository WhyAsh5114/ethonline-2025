"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { TOTPSetup } from "@/components/totp-setup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveProfile } from "@/lib/profile-storage";

export default function SetupPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isComplete, setIsComplete] = useState(false);

  const handleTOTPComplete = (_secret: string, hash: bigint) => {
    // Save the hash to profile (NOT the secret!)
    saveProfile({
      secretHash: `0x${hash.toString(16)}`,
      ownerAddress: address || null,
    });

    setIsComplete(true);

    // Redirect to deploy page after a short delay
    setTimeout(() => {
      router.push("/dashboard/deploy");
    }, 1500);
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
          <h1 className="text-3xl font-bold">TOTP Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Configure your Time-based One-Time Password authentication
          </p>
        </div>
      </div>

      {isComplete ? (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary">✓ Setup Complete</CardTitle>
            <CardDescription>
              Your TOTP has been configured successfully. Redirecting to wallet
              deployment...
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configure TOTP</CardTitle>
            <CardDescription>
              Scan the QR code with your authenticator app and verify the code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TOTPSetup onComplete={handleTOTPComplete} />
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What is TOTP?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              TOTP (Time-based One-Time Password) generates temporary codes that
              change every 30 seconds, providing an additional layer of security
              for your smart wallet.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Your TOTP secret is never stored in localStorage or transmitted to
              any server. Only the hash is saved for wallet deployment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
