"use client";

import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode("qr-tx-reader");
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
            const txRequest: TransactionRequest = {
              to: parsedData.to,
              value: BigInt(parsedData.value),
              data: parsedData.data,
              nonce: BigInt(parsedData.nonce),
              commitment: BigInt(parsedData.commitment),
              walletAddress: parsedData.walletAddress,
            };

            onTransactionScanned(txRequest);
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
    onClose();
  };

  // Auto-start scanning when dialog opens
  useEffect(() => {
    if (isOpen) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Transaction Request</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code displayed on your transaction
            device
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
          <div id="qr-tx-reader" className="w-full" />
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
  );
}
