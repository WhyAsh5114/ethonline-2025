"use client";

import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type Address, isAddress, parseEther } from "viem";
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

export function TransactionExecution({
  walletAddress,
}: TransactionExecutionProps) {
  const { executeTransaction, isExecuting } = useTOTPWallet();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [callData, setCallData] = useState("");
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");

  const handleExecute = async () => {
    if (!walletAddress) {
      toast.error("Wallet not deployed");
      return;
    }

    if (!isAddress(recipient)) {
      toast.error("Invalid recipient address");
      return;
    }

    try {
      const value = amount ? parseEther(amount) : BigInt(0);
      const data = (callData || "0x") as `0x${string}`;

      await executeTransaction({
        walletAddress,
        to: recipient as Address,
        value,
        data,
      });

      setExecutionStatus("success");
      toast.success("Transaction executed successfully");

      // Reset form
      setRecipient("");
      setAmount("");
      setCallData("");
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
                Your transaction has been executed successfully.
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
        <Button
          onClick={handleExecute}
          disabled={!walletAddress || !recipient || isExecuting}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Transaction...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Execute Transaction
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
