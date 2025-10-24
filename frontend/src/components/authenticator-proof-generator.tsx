"use client";

import { AlertCircle, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { QRTransactionScanner } from "@/components/qr-transaction-scanner";
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

interface TransactionRequest {
  to: Address;
  value: bigint;
  data: string;
  nonce: bigint;
  commitment: bigint;
  walletAddress: Address;
}

interface SolidityProof {
  pA: readonly [bigint, bigint];
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  pC: readonly [bigint, bigint];
  publicSignals: readonly [bigint, bigint, bigint, bigint];
}

interface AuthenticatorProofGeneratorProps {
  secret: string;
  accountName: string;
}

export function AuthenticatorProofGenerator({
  secret,
  accountName,
}: AuthenticatorProofGeneratorProps) {
  const [txRequest, setTxRequest] = useState<TransactionRequest | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [proof, setProof] = useState<SolidityProof | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "generating" | "ready" | "failed"
  >("idle");

  const handleTransactionScanned = (scannedRequest: TransactionRequest) => {
    setTxRequest(scannedRequest);
    setShowScanner(false);
    setStatus("idle");
    toast.success("Transaction request scanned successfully");
  };

  const handleGenerateProof = async () => {
    if (!txRequest) {
      toast.error("No transaction request scanned");
      return;
    }

    if (!totpCode || totpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit TOTP code");
      return;
    }

    try {
      setIsGenerating(true);
      setStatus("generating");

      // Import ZK proof generation
      const { generateZKProof, formatProofForSolidity } = await import(
        "@/lib/zk-proof"
      );

      // Prepare transaction parameters for commitment
      const txParams = {
        to: txRequest.to,
        value: txRequest.value,
        data: txRequest.data,
        nonce: txRequest.nonce,
      };

      // Generate ZK proof with transaction binding
      const timestamp = Math.floor(Date.now() / 1000);
      const zkProof = await generateZKProof(
        secret,
        totpCode,
        timestamp,
        txParams,
      );

      if (!zkProof) {
        throw new Error("Failed to generate ZK proof");
      }

      // Convert proof to Solidity format
      const solidityProof = formatProofForSolidity(zkProof);

      setProof(solidityProof);
      setStatus("ready");
      toast.success(
        "Proof generated successfully! Show QR to transaction device.",
      );
    } catch (error) {
      console.error("Failed to generate proof:", error);
      setStatus("failed");
      toast.error(
        error instanceof Error ? error.message : "Failed to generate proof",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getProofQRData = () => {
    if (!proof) return "";

    // Convert BigInt values to strings for JSON serialization
    return JSON.stringify({
      pA: [proof.pA[0].toString(), proof.pA[1].toString()],
      pB: [
        [proof.pB[0][0].toString(), proof.pB[0][1].toString()],
        [proof.pB[1][0].toString(), proof.pB[1][1].toString()],
      ],
      pC: [proof.pC[0].toString(), proof.pC[1].toString()],
      publicSignals: [
        proof.publicSignals[0].toString(),
        proof.publicSignals[1].toString(),
        proof.publicSignals[2].toString(),
        proof.publicSignals[3].toString(),
      ],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Proof for Transaction</CardTitle>
        <CardDescription>
          Account: {accountName} | Scan transaction QR and generate proof
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!txRequest ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground">
                  Step 1: Scan Transaction Request
                </p>
                <p className="mt-1 text-muted-foreground">
                  Use the QR scanner below to scan the transaction request from
                  your transaction device.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              className="w-full"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scan Transaction QR
            </Button>

            {showScanner && (
              <QRTransactionScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onTransactionScanned={handleTransactionScanned}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-2 font-semibold text-sm text-primary">
                Transaction Details
              </h4>
              <div className="space-y-1 text-xs font-mono">
                <p>
                  <span className="text-muted-foreground">To:</span>{" "}
                  {txRequest.to}
                </p>
                <p>
                  <span className="text-muted-foreground">Value:</span>{" "}
                  {txRequest.value.toString()} wei
                </p>
                <p>
                  <span className="text-muted-foreground">Nonce:</span>{" "}
                  {txRequest.nonce.toString()}
                </p>
              </div>
            </div>

            {status !== "ready" && (
              <div className="space-y-2">
                <Label htmlFor="totpCode">Enter TOTP Code</Label>
                <Input
                  id="totpCode"
                  type="text"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={isGenerating}
                  maxLength={6}
                  className="font-mono text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the current 6-digit code from this device
                </p>
              </div>
            )}

            {status === "ready" && proof && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-foreground">
                      Proof Generated Successfully
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Show this QR code to your transaction device to complete
                      the transaction.
                    </p>
                  </div>
                </div>

                <div className="flex justify-center rounded-lg border border-border bg-background p-6">
                  <QRCodeSVG
                    value={getProofQRData()}
                    size={300}
                    level="L"
                    includeMargin
                  />
                </div>

                <Button
                  onClick={() => {
                    setTxRequest(null);
                    setTotpCode("");
                    setProof(null);
                    setStatus("idle");
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Generate Another Proof
                </Button>
              </div>
            )}

            {status === "failed" && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-foreground">
                    Proof Generation Failed
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Please try again with the correct TOTP code.
                  </p>
                </div>
              </div>
            )}

            {status !== "ready" && (
              <Button
                onClick={handleGenerateProof}
                disabled={!totpCode || totpCode.length !== 6 || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Proof...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate Proof
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
