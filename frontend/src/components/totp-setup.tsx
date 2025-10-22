"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
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
import { useTOTPSetup } from "@/hooks/use-totp-setup";
import { verifyTOTPCode } from "@/lib/totp";

interface TOTPSetupProps {
  onComplete?: (secret: string, secretHash: bigint) => void;
}

export function TOTPSetup({ onComplete }: TOTPSetupProps) {
  const { address } = useAccount();
  const { totpSecret, isGenerating, generateSecret } = useTOTPSetup();
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (address && !totpSecret) {
      generateSecret(address);
    }
  }, [address, totpSecret, generateSecret]);

  const handleCopySecret = async () => {
    if (totpSecret?.secret) {
      await navigator.clipboard.writeText(totpSecret.secret);
      toast.success("Secret copied to clipboard");
    }
  };

  const handleVerify = () => {
    if (!totpSecret || !verificationCode) return;

    setIsVerifying(true);
    setTimeout(() => {
      const isValid = verifyTOTPCode(totpSecret.secret, verificationCode);

      if (isValid) {
        setIsVerified(true);
        toast.success("TOTP verified successfully");
        onComplete?.(totpSecret.secret, totpSecret.secretHash);
      } else {
        toast.error("Invalid code. Please try again.");
      }
      setIsVerifying(false);
    }, 500);
  };

  if (isGenerating) {
    return (
      <Card data-slot="totp-loading">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Generating TOTP secret...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isVerified) {
    return (
      <Card data-slot="totp-verified" className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>2FA Configured</CardTitle>
              <CardDescription>
                Your authenticator app is linked successfully
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Enhanced Security Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All transactions will require 2FA verification
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!totpSecret) {
    return (
      <Card data-slot="totp-error">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="mt-4 text-sm text-muted-foreground">
            Failed to generate TOTP secret
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-slot="totp-setup" className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Set Up 2FA</CardTitle>
            <CardDescription>
              Scan with Google Authenticator or Authy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-lg border-2 border-primary/20 bg-background p-4">
            <QRCodeSVG
              value={totpSecret.uri}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <div className="w-full space-y-2">
            <Label htmlFor="secret" className="text-sm font-medium">
              Manual Entry Code
            </Label>
            <div className="flex gap-2">
              <Input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={totpSecret.secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
                className="shrink-0"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          <div className="space-y-2">
            <Label htmlFor="verification-code" className="text-sm font-medium">
              Enter 6-Digit Code
            </Label>
            <Input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
              className="text-center text-lg font-medium tracking-widest"
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={verificationCode.length !== 6 || isVerifying}
            className="w-full gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Verify & Complete Setup
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium">Important</p>
              <p>
                Save your secret key securely. You&apos;ll need it to recover
                access if you lose your authenticator device.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
