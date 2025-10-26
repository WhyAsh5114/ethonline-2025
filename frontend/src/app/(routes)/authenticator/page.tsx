"use client";

import {
  Check,
  Copy,
  Download,
  Plus,
  QrCode,
  Scan,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthenticatorProofGenerator } from "@/components/authenticator-proof-generator";
import { TOTPQRScanner } from "@/components/totp-qr-scanner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoredAccount } from "@/lib/authenticator-storage";
import {
  addAccount,
  deleteAccount,
  exportAccounts,
  getAllAccounts,
  importAccounts,
  updateAccount,
} from "@/lib/authenticator-storage";
import { generatePoseidonTOTPCode, getTimeRemaining } from "@/lib/totp";

export default function AuthenticatorPage() {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [manualSecret, setManualSecret] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  // Load accounts on mount
  const loadAccounts = useCallback(async () => {
    try {
      const loadedAccounts = await getAllAccounts();
      setAccounts(loadedAccounts);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      toast.error("Failed to load accounts");
    }
  }, []);

  const generateAllCodes = useCallback(async () => {
    const newCodes: Record<string, string> = {};

    for (const account of accounts) {
      try {
        const code = await generatePoseidonTOTPCode(account.secret);
        newCodes[account.id] = code;

        // Update last used time
        await updateAccount(account.id, { lastUsed: Date.now() });
      } catch (error) {
        console.error(`Failed to generate code for ${account.name}:`, error);
        newCodes[account.id] = "------";
      }
    }

    setCodes(newCodes);
  }, [accounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Generate codes immediately on mount and when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      generateAllCodes();
    }
  }, [accounts, generateAllCodes]);

  // Auto-refresh codes every second
  useEffect(() => {
    const updateCodesAndTimer = async () => {
      const remaining = getTimeRemaining();
      setTimeLeft(remaining);

      // Regenerate codes when window resets
      if (remaining === 30) {
        await generateAllCodes();
      }
    };

    updateCodesAndTimer();
    const interval = setInterval(updateCodesAndTimer, 1000);

    return () => clearInterval(interval);
  }, [generateAllCodes]);

  const handleAddManualAccount = async () => {
    if (!manualSecret || manualSecret.length !== 20) {
      toast.error("Secret must be exactly 20 digits");
      return;
    }

    if (!manualAddress) {
      toast.error("Please enter an address");
      return;
    }

    try {
      await addAccount({
        secret: manualSecret,
        address: manualAddress,
        name: manualName || manualAddress.slice(0, 10),
        secretHash: "0", // Will be calculated if needed
      });

      toast.success("Account added successfully");
      setIsAddingAccount(false);
      setManualSecret("");
      setManualName("");
      setManualAddress("");
      await loadAccounts();
    } catch (error) {
      console.error("Failed to add account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add account",
      );
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Delete account "${name}"?`)) return;

    try {
      await deleteAccount(id);
      toast.success("Account deleted");
      await loadAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success("Code copied to clipboard");

      setTimeout(() => setCopiedId(null), 2000);
    } catch (_error) {
      toast.error("Failed to copy code");
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAccounts();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chronovault-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Accounts exported successfully");
    } catch (error) {
      console.error("Failed to export:", error);
      toast.error("Failed to export accounts");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importAccounts(text);
      toast.success(`Imported ${count} account(s)`);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to import:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import accounts",
      );
    }
  };

  const handleQRScanned = async (account: {
    secret: string;
    address: string;
    name: string;
  }) => {
    try {
      await addAccount({
        secret: account.secret,
        address: account.address,
        name: account.name,
        secretHash: "0", // Will be calculated if needed
      });

      toast.success("Account added successfully from QR code");
      await loadAccounts();
    } catch (error) {
      console.error("Failed to add account from QR:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add account",
      );
    }
  };

  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : null;

  // If an account is selected, show the proof generator
  if (selectedAccount) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedAccountId(null)}>
            ← Back to Accounts
          </Button>
        </div>
        <AuthenticatorProofGenerator
          secret={selectedAccount.secret}
          accountName={selectedAccount.name}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ChronoVault Authenticator</h1>
          <p className="mt-2 text-muted-foreground">
            Generate TOTP codes for your ChronoVault wallets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <label htmlFor="import-file">
              <Upload className="h-4 w-4" />
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-mono text-muted-foreground">
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {accounts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                No accounts added yet.
                <br />
                Add an account by scanning a QR code or entering manually.
              </p>
            </CardContent>
          </Card>
        )}

        {accounts.map((account) => (
          <Card
            key={account.id}
            data-slot="authenticator-account"
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setSelectedAccountId(account.id)}
          >
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <CardDescription className="font-mono text-xs break-all">
                    {account.address.slice(0, 10)}...{account.address.slice(-8)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAccount(account.id, account.name);
                  }}
                  className="self-end sm:self-start"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex-1 cursor-pointer select-none border-none bg-transparent p-0 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCode(account.id, codes[account.id] || "------");
                  }}
                >
                  <div className="text-3xl sm:text-4xl font-bold font-mono tracking-[0.3em] sm:tracking-[0.5em]">
                    {codes[account.id] || "------"}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCode(account.id, codes[account.id] || "------");
                  }}
                  className="ml-4"
                >
                  {copiedId === account.id ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Click card to generate transaction proof
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
        <DialogTrigger asChild>
          <Button className="mt-6 w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Account Manually
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Enter your ChronoVault account details manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name (optional)</Label>
              <Input
                id="name"
                placeholder="My Wallet"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Ethereum Address</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Secret (20 digits)</Label>
              <Input
                id="secret"
                placeholder="12345678901234567890"
                value={manualSecret}
                onChange={(e) =>
                  setManualSecret(
                    e.target.value.replace(/\D/g, "").slice(0, 20),
                  )
                }
                maxLength={20}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The 20-digit numeric secret from your ChronoVault setup
              </p>
            </div>
            <Button onClick={handleAddManualAccount} className="w-full">
              Add Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setIsScanningQR(true)}
      >
        <Scan className="h-4 w-4" />
        Scan QR Code
      </Button>

      <TOTPQRScanner
        isOpen={isScanningQR}
        onClose={() => setIsScanningQR(false)}
        onAccountScanned={handleQRScanned}
      />
    </div>
  );
}
