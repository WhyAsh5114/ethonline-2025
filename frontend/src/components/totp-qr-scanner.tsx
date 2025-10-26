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
import { parseQRData } from "@/lib/authenticator-storage";

interface TOTPQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountScanned: (account: {
    secret: string;
    address: string;
    name: string;
  }) => void;
}

export function TOTPQRScanner({
  isOpen,
  onClose,
  onAccountScanned,
}: TOTPQRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const result = detectedCodes[0].rawValue;
      try {
        const parsedData = parseQRData(result);

        if (!parsedData) {
          setError("Invalid ChronoVault TOTP QR code");
          return;
        }

        onAccountScanned(parsedData);
        onClose();
      } catch (err) {
        console.error("Invalid QR code format:", err);
        setError("Invalid QR code format");
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
          <DialogTitle>Scan TOTP QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code from ChronoVault Setup TOTP
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
