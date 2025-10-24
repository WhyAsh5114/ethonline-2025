"use client";

import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type Address, formatEther, parseEther } from "viem";
import {
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
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

interface WalletFundingProps {
  walletAddress: Address;
}

export function WalletFunding({ walletAddress }: WalletFundingProps) {
  const [amount, setAmount] = useState("");
  const [fundingStatus, setFundingStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");

  const { data: balance, refetch: refetchBalance } = useBalance({
    address: walletAddress,
  });

  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
  } = useSendTransaction();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    onReplaced: (replacement) => {
      if (replacement.reason === "cancelled") {
        setFundingStatus("error");
        toast.error("Transaction was cancelled");
      }
    },
  });

  const handleFund = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setFundingStatus("pending");

      sendTransaction(
        {
          to: walletAddress,
          value: parseEther(amount),
        },
        {
          onSuccess: () => {
            setFundingStatus("success");
            toast.success("Wallet funded successfully!");
            setAmount("");
            refetchBalance();
          },
          onError: (error) => {
            setFundingStatus("error");
            toast.error(error.message || "Failed to fund wallet");
          },
        },
      );
    } catch (error) {
      console.error("Failed to fund wallet:", error);
      setFundingStatus("error");
      toast.error(
        error instanceof Error ? error.message : "Failed to fund wallet",
      );
    }
  };

  const isPending = isSending || isConfirming;

  return (
    <Card data-slot="wallet-funding">
      <CardHeader>
        <CardTitle>Fund Wallet</CardTitle>
        <CardDescription>
          Send ETH to your smart wallet to pay for transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {balance !== undefined && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Current Balance
                </span>
              </div>
              <span className="text-lg font-semibold">
                {formatEther(balance.value)} ETH
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (ETH)</Label>
          <Input
            id="amount"
            type="number"
            step="0.001"
            min="0"
            placeholder="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Minimum recommended: 0.01 ETH for gas fees
          </p>
        </div>

        {fundingStatus === "success" && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Wallet Funded</p>
              <p className="mt-1 text-muted-foreground">
                Your wallet now has funds available for transactions.
              </p>
            </div>
          </div>
        )}

        {fundingStatus === "error" && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Funding Failed</p>
              <p className="mt-1 text-muted-foreground">
                Please check your balance and try again.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleFund}
          disabled={isPending || !amount}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSending ? "Sending..." : "Confirming..."}
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Fund Wallet
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
