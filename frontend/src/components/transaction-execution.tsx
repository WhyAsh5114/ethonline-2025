"use client";

import { AlertCircle, CheckCircle2, Loader2, QrCode, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Address,
  encodePacked,
  isAddress,
  keccak256,
  parseEther,
} from "viem";
import { QRProofScanner } from "@/components/qr-proof-scanner";
import { TransactionQRDisplay } from "@/components/transaction-qr-display";
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
import { Textarea } from "@/components/ui/textarea";
import { useTOTPWallet } from "@/hooks/use-totp-wallet";

interface TransactionExecutionProps {
  walletAddress: Address | null;
}

type SolidityProof = {
  pA: readonly [bigint, bigint];
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  pC: readonly [bigint, bigint];
  publicSignals: readonly [bigint, bigint, bigint, bigint];
};

type TransactionRequest = {
  to: Address;
  value: bigint;
  data: `0x${string}`;
  nonce: bigint;
  commitment: bigint;
  walletAddress: Address;
};

export function TransactionExecution({
  walletAddress,
}: TransactionExecutionProps) {
  const { executeWithProof, isExecuting, getWalletInfo } = useTOTPWallet();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [callData, setCallData] = useState("");
  const [txRequest, setTxRequest] = useState<TransactionRequest | null>(null);
  const [_proof, setProof] = useState<SolidityProof | null>(null);
  const [showQRRequest, setShowQRRequest] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "preparing" | "waiting_proof" | "executing" | "success" | "failed"
  >("idle");

  // Field prime for transaction commitment calculation
  const FIELD_PRIME = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617",
  );

  const handlePrepareTransaction = async () => {
    if (!walletAddress) {
      toast.error("Wallet not deployed");
      return;
    }

    if (!isAddress(recipient)) {
      toast.error("Invalid recipient address");
      return;
    }

    try {
      setExecutionStatus("preparing");

      const value = amount ? parseEther(amount) : BigInt(0);
      const data = (callData || "0x") as `0x${string}`;

      // Get current nonce from wallet
      const walletInfo = await getWalletInfo(walletAddress);
      const nonce = walletInfo.nonce;

      // Calculate transaction commitment: keccak256(to, value, data, nonce) % FIELD_PRIME
      const commitmentHash = keccak256(
        encodePacked(
          ["address", "uint256", "bytes", "uint256"],
          [recipient as Address, value, data, nonce],
        ),
      );
      const commitment = BigInt(commitmentHash) % FIELD_PRIME;

      // Create transaction request
      const request: TransactionRequest = {
        to: recipient as Address,
        value,
        data,
        nonce,
        commitment,
        walletAddress,
      };

      setTxRequest(request);
      setShowQRRequest(true);
      setExecutionStatus("waiting_proof");
      toast.success("Transaction prepared. Show QR to authenticator device.");
    } catch (error) {
      console.error("Failed to prepare transaction:", error);
      setExecutionStatus("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to prepare transaction",
      );
    }
  };

  const handleProofScanned = async (scannedProof: SolidityProof) => {
    if (!txRequest) {
      toast.error("No transaction request prepared");
      return;
    }

    try {
      setExecutionStatus("executing");
      setShowQRScanner(false);
      setProof(scannedProof);

      // Submit transaction with scanned proof
      await executeWithProof({
        walletAddress: txRequest.walletAddress,
        to: txRequest.to,
        value: txRequest.value,
        data: txRequest.data,
        proof: scannedProof,
      });

      setExecutionStatus("success");
      toast.success("Transaction executed successfully!");

      // Reset form
      setRecipient("");
      setAmount("");
      setCallData("");
      setTxRequest(null);
      setProof(null);
      setShowQRRequest(false);
    } catch (error) {
      console.error("Failed to execute transaction:", error);
      setExecutionStatus("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to execute transaction",
      );
    }
  };

  const handleCancelTransaction = () => {
    setTxRequest(null);
    setProof(null);
    setShowQRRequest(false);
    setShowQRScanner(false);
    setExecutionStatus("idle");
    toast.info("Transaction cancelled");
  };

  return (
    <Card data-slot="transaction-execution">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Send className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>Execute Transaction</CardTitle>
            <CardDescription>
              Send transactions through your TOTP-protected wallet
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!walletAddress && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Wallet Not Deployed</p>
              <p className="mt-1 text-muted-foreground">
                Deploy your wallet first to execute transactions.
              </p>
            </div>
          </div>
        )}

        {walletAddress && (
          <>
            <div className="space-y-2">
              <Label>From (Wallet Address)</Label>
              <Input
                value={walletAddress}
                readOnly
                className="font-mono text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">To (Recipient Address)</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={isExecuting}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The address to send the transaction to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isExecuting}
                step="0.001"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Amount of ETH to send (leave empty for 0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calldata">Call Data (Optional)</Label>
              <Textarea
                id="calldata"
                placeholder="0x..."
                value={callData}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCallData(e.target.value)
                }
                disabled={isExecuting}
                className="font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Hex-encoded call data for contract interactions
              </p>
            </div>

            {/* QR Code Flow Status */}
            {executionStatus === "waiting_proof" && txRequest && (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-3 font-semibold text-sm text-primary">
                    Step 1: Show QR to Authenticator Device
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with your authenticator device to generate
                    a proof.
                  </p>
                  {showQRRequest && (
                    <TransactionQRDisplay txRequest={txRequest} />
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h4 className="mb-3 font-semibold text-sm">
                    Step 2: Scan Proof QR from Authenticator
                  </h4>
                  <Button
                    onClick={() => setShowQRScanner(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Open QR Scanner
                  </Button>
                </div>

                {showQRScanner && (
                  <QRProofScanner
                    isOpen={showQRScanner}
                    onClose={() => setShowQRScanner(false)}
                    onProofScanned={handleProofScanned}
                  />
                )}

                <Button
                  onClick={handleCancelTransaction}
                  variant="outline"
                  className="w-full"
                >
                  Cancel Transaction
                </Button>
              </div>
            )}
          </>
        )}

        {executionStatus === "success" && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                Transaction Successful
              </p>
              <p className="mt-1 text-muted-foreground">
                Your transaction has been executed successfully on-chain.
              </p>
            </div>
          </div>
        )}

        {executionStatus === "failed" && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Transaction Failed</p>
              <p className="mt-1 text-muted-foreground">
                The transaction could not be executed. Please try again.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {executionStatus === "idle" ||
        executionStatus === "failed" ||
        executionStatus === "preparing" ? (
          <Button
            onClick={handlePrepareTransaction}
            disabled={
              !walletAddress || !recipient || executionStatus === "preparing"
            }
            className="w-full"
          >
            {executionStatus === "preparing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Transaction...
              </>
            ) : (
              <>
                <QrCode className="mr-2 h-4 w-4" />
                Prepare Transaction QR
              </>
            )}
          </Button>
        ) : executionStatus === "executing" ? (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Executing Transaction...
          </Button>
        ) : executionStatus === "success" ? (
          <Button
            onClick={() => {
              setExecutionStatus("idle");
              setRecipient("");
              setAmount("");
              setCallData("");
            }}
            className="w-full"
          >
            New Transaction
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
