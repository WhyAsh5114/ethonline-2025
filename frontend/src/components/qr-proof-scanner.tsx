"use client";

import { Html5Qrcode } from "html5-qrcode";
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
  onProofScanned: (proof: {
    pA: readonly [bigint, bigint];
    pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
    pC: readonly [bigint, bigint];
    publicSignals: readonly [bigint, bigint, bigint, bigint];
  }) => void;
  onCancel: () => void;
}

export function QRProofScanner({
  onProofScanned,
  onCancel,
}: QRProofScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode("qr-reader");
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            const parsedData = JSON.parse(decodedText);

            // Convert string values back to bigint
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
            stopScanning();
          } catch (error) {
            console.error("Invalid QR code format:", error);
          }
        },
        (_errorMessage) => {
          // Ignore scan errors (just means no QR code visible yet)
        },
      );
    } catch (error) {
      console.error("Failed to start camera:", error);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (error) {
        console.error("Failed to stop scanner:", error);
      }
    }
    setIsScanning(false);
    setScanner(null);
  };

  const handleClose = () => {
    stopScanning();
    onCancel();
  };

  // Auto-start scanning when component mounts
  useState(() => {
    startScanning();
  });

  return (
    <div className="space-y-4">
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan ZK Proof</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code displayed on your authenticator
              device
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
            <div id="qr-reader" className="w-full" />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Initializing camera...
                </p>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
