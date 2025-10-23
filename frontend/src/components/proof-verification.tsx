"use client";

import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
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
import { useZKProof } from "@/hooks/use-zk-proof";

interface ProofVerificationProps {
  totpSecret: string | null; // Numeric secret for ZK proof
  walletAddress: Address | null;
}

export function ProofVerification({
  totpSecret,
  walletAddress,
}: ProofVerificationProps) {
  const {
    proof,
    solidityProof,
    isGenerating,
    generateProof,
    verifyProof: verifyProofLocally,
  } = useZKProof();
  const { verifyProof: verifyProofOnChain, isVerifying } = useTOTPWallet();

  const [totpCode, setTotpCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "local-verified" | "onchain-verified" | "failed"
  >("idle");

  const handleGenerateProof = async () => {
    if (!totpSecret) {
      toast.error("TOTP secret not available");
      return;
    }

    if (!totpCode || totpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit TOTP code");
      return;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Use the manually entered TOTP code for proof generation
      await generateProof(totpSecret, totpCode, timestamp);

      toast.success("ZK proof generated successfully");
      setVerificationStatus("idle");
    } catch (error) {
      console.error("Failed to generate proof:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate proof",
      );
      setVerificationStatus("failed");
    }
  };

  const handleVerifyLocally = async () => {
    try {
      const isValid = await verifyProofLocally();
      if (isValid) {
        setVerificationStatus("local-verified");
        toast.success("Proof verified locally");
      } else {
        setVerificationStatus("failed");
        toast.error("Proof verification failed");
      }
    } catch (error) {
      console.error("Failed to verify proof:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to verify proof",
      );
      setVerificationStatus("failed");
    }
  };

  const handleVerifyOnChain = async () => {
    if (!walletAddress || !solidityProof) {
      toast.error("Wallet or proof not available");
      return;
    }

    try {
      const isValid = await verifyProofOnChain(walletAddress, solidityProof);
      if (isValid) {
        setVerificationStatus("onchain-verified");
        toast.success("Proof verified on-chain");
      } else {
        setVerificationStatus("failed");
        toast.error("On-chain verification failed");
      }
    } catch (error) {
      console.error("Failed to verify proof on-chain:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to verify proof on-chain",
      );
      setVerificationStatus("failed");
    }
  };

  return (
    <Card data-slot="proof-verification">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>ZK Proof Verification</CardTitle>
            <CardDescription>
              Generate and verify zero-knowledge proofs for TOTP authentication
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!totpSecret && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                TOTP Secret Required
              </p>
              <p className="mt-1 text-muted-foreground">
                Please set up your TOTP authenticator first.
              </p>
            </div>
          </div>
        )}

        {!walletAddress && totpSecret && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Wallet Not Deployed</p>
              <p className="mt-1 text-muted-foreground">
                Deploy your wallet first to verify proofs on-chain.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="totp-code">Enter TOTP Code from Authenticator</Label>
          <Input
            id="totp-code"
            placeholder="000000"
            value={totpCode}
            onChange={(e) =>
              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={!totpSecret || isGenerating}
            maxLength={6}
            className="font-mono text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from your ChronoVault Authenticator app. The
            code changes every 30 seconds.
          </p>
        </div>

        {proof && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Proof Generated</p>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Public Signals:</p>
                <div className="mt-1 space-y-1 font-mono">
                  <p>TOTP Code: {proof.publicSignals[0]}</p>
                  <p>Time Counter: {proof.publicSignals[1]}</p>
                  <p>Secret Hash: {proof.publicSignals[2]}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {verificationStatus === "local-verified" && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Locally Verified</p>
              <p className="mt-1 text-muted-foreground">
                The proof is valid. You can now verify it on-chain.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === "onchain-verified" && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">On-Chain Verified</p>
              <p className="mt-1 text-muted-foreground">
                The proof has been verified on the blockchain.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === "failed" && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Verification Failed</p>
              <p className="mt-1 text-muted-foreground">
                The proof could not be verified. Please try again.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          onClick={handleGenerateProof}
          disabled={!totpSecret || !totpCode || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Proof...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Generate Proof
            </>
          )}
        </Button>

        {proof && verificationStatus === "idle" && (
          <Button
            onClick={handleVerifyLocally}
            disabled={isGenerating}
            variant="outline"
            className="w-full"
          >
            Verify Locally
          </Button>
        )}

        {proof && walletAddress && verificationStatus === "local-verified" && (
          <Button
            onClick={handleVerifyOnChain}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying On-Chain...
              </>
            ) : (
              "Verify On-Chain"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
