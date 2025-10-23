"use client";

import { ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { TOTPSetup } from "@/components/totp-setup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WalletConnect } from "@/components/wallet-connect";
import { cn } from "@/lib/utils";

type OnboardingStep = "wallet" | "totp" | "complete";

export default function OnboardingPage() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("wallet");
  const [totpConfigured, setTotpConfigured] = useState(false);

  useEffect(() => {
    const configured = sessionStorage.getItem("totp_configured");
    if (isConnected && configured === "true") {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  useEffect(() => {
    if (isConnected && currentStep === "wallet") {
      setCurrentStep("totp");
    } else if (!isConnected && currentStep !== "wallet") {
      setCurrentStep("wallet");
      setTotpConfigured(false);
    }
  }, [isConnected, currentStep]);

  const handleTOTPComplete = (_secret: string, _secretHash: bigint) => {
    setTotpConfigured(true);
    sessionStorage.setItem("totp_configured", "true");
    setCurrentStep("complete");
  };

  const handleGetStarted = () => {
    router.push("/dashboard");
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem("totp_configured");
    setTotpConfigured(false);
    setCurrentStep("wallet");
    disconnect();
  };

  const getProgress = () => {
    switch (currentStep) {
      case "wallet":
        return 0;
      case "totp":
        return 50;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  const steps = [
    { id: "wallet", label: "Connect Wallet", completed: isConnected },
    { id: "totp", label: "Setup 2FA", completed: totpConfigured },
    {
      id: "complete",
      label: "Complete",
      completed: currentStep === "complete",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                ChronoVault Setup
              </h1>
            </div>
            <p className="text-muted-foreground">
              Secure your crypto with bank-grade 2FA protection
            </p>
            {isConnected && currentStep !== "complete" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="mt-4"
              >
                Disconnect & Start Over
              </Button>
            )}
          </div>

          <div className="mb-8 space-y-4">
            <div className="mx-auto flex w-full max-w-md items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                        step.completed
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-24 transition-all",
                        step.completed ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mx-auto max-w-md">
              <Progress value={getProgress()} className="h-2" />
            </div>
          </div>

          <div className="space-y-6">
            {currentStep === "wallet" && <WalletConnect />}

            {currentStep === "totp" && (
              <TOTPSetup onComplete={handleTOTPComplete} />
            )}

            {currentStep === "complete" && (
              <Card
                data-slot="onboarding-complete"
                className="border-primary/20 bg-gradient-to-b from-primary/5 to-background"
              >
                <CardHeader className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-primary/10 p-4">
                      <CheckCircle2 className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">All Set!</CardTitle>
                  <CardDescription>
                    Your wallet is now protected with 2FA authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-background p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Wallet Connected</p>
                        <p className="text-xs text-muted-foreground">
                          Your wallet is connected and ready to use
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">2FA Enabled</p>
                        <p className="text-xs text-muted-foreground">
                          All transactions require authentication code
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Zero-Knowledge Proofs
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Your TOTP codes are verified privately on-chain
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGetStarted}
                    className="w-full gap-2"
                    size="lg"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
