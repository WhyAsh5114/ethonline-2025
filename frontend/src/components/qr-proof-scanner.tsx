"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRProofScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProofScanned: (proof: {
    pA: readonly [bigint, bigint];
    pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
    pC: readonly [bigint, bigint];
    publicSignals: readonly [bigint, bigint, bigint, bigint];
  }) => void;
}

export function QRProofScanner({
  isOpen,
  onClose,
  onProofScanned,
}: QRProofScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const result = detectedCodes[0].rawValue;
      try {
        const parsedData = JSON.parse(result);

        // Convert string values back to bigint
        const proof = {
          pA: [BigInt(parsedData.pA[0]), BigInt(parsedData.pA[1])] as const,
          pB: [
            [BigInt(parsedData.pB[0][0]), BigInt(parsedData.pB[0][1])] as const,
            [BigInt(parsedData.pB[1][0]), BigInt(parsedData.pB[1][1])] as const,
          ] as const,
          pC: [BigInt(parsedData.pC[0]), BigInt(parsedData.pC[1])] as const,
          publicSignals: [
            BigInt(parsedData.publicSignals[0]),
            BigInt(parsedData.publicSignals[1]),
            BigInt(parsedData.publicSignals[2]),
            BigInt(parsedData.publicSignals[3]),
          ] as const,
        };

        onProofScanned(proof);
        onClose();
      } catch (err) {
        console.error("Invalid QR code format:", err);
        setError("Invalid proof QR code");
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
          <DialogTitle>Scan ZK Proof</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code displayed on your authenticator
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
