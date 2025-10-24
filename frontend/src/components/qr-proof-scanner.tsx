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
  const [scannedParts, setScannedParts] = useState<Record<number, unknown>>({});
  const [totalParts, setTotalParts] = useState<number>(0);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const result = detectedCodes[0].rawValue;
      try {
        const parsedData = JSON.parse(result);

        // Check if this is a multi-part QR code
        if (parsedData.part && parsedData.total) {
          const { part, total, data } = parsedData;

          // Store this part
          setScannedParts((prev) => ({ ...prev, [part]: data }));
          setTotalParts(total);

          // Check if we have all parts
          const newParts = { ...scannedParts, [part]: data };
          if (Object.keys(newParts).length === total) {
            // Reconstruct the full proof
            const fullProof = {
              pA: newParts[1].pA,
              pB: [newParts[1].pB0, newParts[2].pB1],
              pC: newParts[2].pC,
              publicSignals: newParts[3].publicSignals,
            };

            // Convert string values back to bigint
            const proof = {
              pA: [BigInt(fullProof.pA[0]), BigInt(fullProof.pA[1])] as const,
              pB: [
                [
                  BigInt(fullProof.pB[0][0]),
                  BigInt(fullProof.pB[0][1]),
                ] as const,
                [
                  BigInt(fullProof.pB[1][0]),
                  BigInt(fullProof.pB[1][1]),
                ] as const,
              ] as const,
              pC: [BigInt(fullProof.pC[0]), BigInt(fullProof.pC[1])] as const,
              publicSignals: [
                BigInt(fullProof.publicSignals[0]),
                BigInt(fullProof.publicSignals[1]),
                BigInt(fullProof.publicSignals[2]),
                BigInt(fullProof.publicSignals[3]),
              ] as const,
            };

            onProofScanned(proof);
            onClose();
            setScannedParts({});
            setTotalParts(0);
          } else {
            setError(
              `Scanned ${Object.keys(newParts).length}/${total} parts. Scan remaining parts.`,
            );
          }
        } else {
          // Legacy single QR code format
          const proof = {
            pA: [BigInt(parsedData.pA[0]), BigInt(parsedData.pA[1])] as const,
            pB: [
              [
                BigInt(parsedData.pB[0][0]),
                BigInt(parsedData.pB[0][1]),
              ] as const,
              [
                BigInt(parsedData.pB[1][0]),
                BigInt(parsedData.pB[1][1]),
              ] as const,
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
        }
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
          {totalParts > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium">
                Multi-part scan: {Object.keys(scannedParts).length}/{totalParts}{" "}
                parts collected
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scan all {totalParts} QR codes from the authenticator
              </p>
            </div>
          )}

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
