"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WalletConnect } from "@/components/wallet-connect";
import {
  clearProfile,
  getProfile,
  type ProfileData,
} from "@/lib/profile-storage";

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome to ChronoVault</h1>
            <p className="mt-2 text-muted-foreground">
              Connect your wallet to get started with TOTP-protected smart
              wallet
            </p>
          </div>
          <WalletConnect />
        </div>
      </div>
    );
  }

  const handleClearProfile = () => {
    clearProfile();
    setProfile(null);
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your ChronoVault setup and navigate to different actions
        </p>
      </div>

      {/* Connected Wallet */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Wallet</CardTitle>
          <CardDescription>
            Your currently connected EOA address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <code className="rounded bg-muted px-2 py-1 text-sm">
                {formatAddress(address || null)}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-semibold text-primary">
                ✓ Connected
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Setup</CardTitle>
          <CardDescription>
            Your saved wallet configuration (stored locally)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Smart Wallet Address
                  </span>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {formatAddress(profile.walletAddress)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Secret Hash
                  </span>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {profile.secretHash
                      ? `${profile.secretHash.slice(0, 8)}...${profile.secretHash.slice(-6)}`
                      : "—"}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Owner Address
                  </span>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {formatAddress(profile.ownerAddress)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Updated
                  </span>
                  <span className="text-sm">
                    {formatDate(profile.lastUpdated)}
                  </span>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearProfile}
                className="w-full"
              >
                Clear Saved Profile
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No saved profile found. Complete the setup process to save your
                configuration.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to different sections</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/setup")}
            className="w-full"
          >
            TOTP Setup
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/deploy")}
            disabled={!profile?.secretHash}
            className="w-full"
          >
            Deploy Wallet
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/verify")}
            className="w-full"
          >
            Verify Proof
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/execute")}
            disabled={!profile?.walletAddress}
            className="w-full"
          >
            Execute Transaction
          </Button>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">TOTP Status</p>
            <p className="mt-1 font-semibold">
              {profile?.secretHash ? "✓ Configured" : "Not Setup"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Wallet Status</p>
            <p className="mt-1 font-semibold">
              {profile?.walletAddress ? "✓ Deployed" : "Not Deployed"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Profile Status</p>
            <p className="mt-1 font-semibold">
              {profile ? "✓ Saved" : "Not Saved"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
