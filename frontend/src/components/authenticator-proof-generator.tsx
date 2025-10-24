"use client";

import { AlertCircle, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
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
import { generatePoseidonTOTPCode } from "@/lib/totp";

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
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "generating" | "ready" | "failed"
  >("idle");

  // Auto-generate TOTP code when transaction is scanned
  useEffect(() => {
    if (txRequest && !totpCode) {
      generatePoseidonTOTPCode(secret)
        .then((code) => {
          setTotpCode(code);
        })
        .catch((error) => {
          console.error("Failed to generate TOTP:", error);
          toast.error("Failed to generate TOTP code");
        });
    }
  }, [txRequest, secret, totpCode]);

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
    if (!proof) return [];

    // Split proof into multiple parts for better scanning
    const proofData = {
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
    };

    // Split into 3 parts for better QR code density
    return [
      JSON.stringify({
        part: 1,
        total: 3,
        data: {
          pA: proofData.pA,
          pB0: proofData.pB[0],
        },
      }),
      JSON.stringify({
        part: 2,
        total: 3,
        data: {
          pB1: proofData.pB[1],
          pC: proofData.pC,
        },
      }),
      JSON.stringify({
        part: 3,
        total: 3,
        data: {
          publicSignals: proofData.publicSignals,
        },
      }),
    ];
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
                      Show QR codes {currentQRIndex + 1}/
                      {getProofQRData().length} to your transaction device.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background p-6">
                  <QRCodeSVG
                    value={getProofQRData()[currentQRIndex]}
                    size={300}
                    level="M"
                    includeMargin
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        setCurrentQRIndex((prev) =>
                          prev > 0 ? prev - 1 : getProofQRData().length - 1,
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentQRIndex + 1} / {getProofQRData().length}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentQRIndex((prev) =>
                          prev < getProofQRData().length - 1 ? prev + 1 : 0,
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setTxRequest(null);
                    setTotpCode("");
                    setProof(null);
                    setStatus("idle");
                    setCurrentQRIndex(0);
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
