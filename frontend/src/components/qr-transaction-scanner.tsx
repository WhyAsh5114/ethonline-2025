"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { X } from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionRequest {
  to: Address;
  value: bigint;
  data: string;
  nonce: bigint;
  commitment: bigint;
  walletAddress: Address;
}

interface QRTransactionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionScanned: (txRequest: TransactionRequest) => void;
}

export function QRTransactionScanner({
  isOpen,
  onClose,
  onTransactionScanned,
}: QRTransactionScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const result = detectedCodes[0].rawValue;
      try {
        const parsedData = JSON.parse(result);

        // Convert string values back to bigint
        const txRequest: TransactionRequest = {
          to: parsedData.to,
          value: BigInt(parsedData.value),
          data: parsedData.data,
          nonce: BigInt(parsedData.nonce),
          commitment: BigInt(parsedData.commitment),
          walletAddress: parsedData.walletAddress,
        };

        onTransactionScanned(txRequest);
        onClose();
      } catch (err) {
        console.error("Invalid QR code format:", err);
        setError("Invalid transaction QR code");
      }
    }
  };

  const handleError = (error: unknown) => {
    console.error("QR Scanner error:", error);
    setError("Failed to access camera. Please check permissions.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Transaction Request</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code displayed on your transaction
            device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
            {isOpen && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: "environment",
                }}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                  },
                  video: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }}
              />
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button variant="outline" onClick={onClose} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
