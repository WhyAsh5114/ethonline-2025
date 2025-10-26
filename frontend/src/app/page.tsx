"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  CheckCircle2,
  CircuitBoard,
  Clock,
  Code2,
  FileKey2,
  Github,
  Layers,
  Lock,
  Shield,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">
              ChronoVault
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#architecture"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Architecture
            </Link>
            <Link
              href="https://github.com/WhyAsh5114/ethonline-2025"
              target="_blank"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Button asChild>
              <Link href="/dashboard">Launch App</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Built for ETHOnline 2025
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
              Transaction-Bound
              <span className="block text-primary">Zero-Knowledge 2FA</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              The first TOTP wallet with cryptographically bound proofs. Each
              transaction requires a ZK proof tied to its exact
              parameters—making intercepted proofs useless for attackers.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  href="https://github.com/WhyAsh5114/ethonline-2025"
                  target="_blank"
                >
                  <Github className="mr-2 h-4 w-4" />
                  View Source
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-gradient-to-b from-muted/50 to-background py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Architecture Overview
                </h2>
                <p className="text-muted-foreground">
                  Three-layer security architecture combining circuits,
                  contracts, and frontend
                </p>
              </div>
              <div className="grid gap-8 lg:grid-cols-3">
                <Card className="relative overflow-hidden border-primary/20">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <CircuitBoard className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Zero-Knowledge Circuits</CardTitle>
                    <CardDescription>
                      Circom-based TOTP verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Circuit File
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        totp_verifier.circom
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Constraints
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        ~1,200 R1CS
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Proving System
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        Groth16
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-primary/20">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileKey2 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Smart Contracts</CardTitle>
                    <CardDescription>
                      Solidity-based wallet implementation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Wallet Contract
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        TOTPWallet.sol
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Verifier
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        TOTPVerifier.sol
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Standard
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        ERC-4337
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-primary/20">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Code2 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Frontend Interface</CardTitle>
                    <CardDescription>
                      Next.js with Web3 integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Framework
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        Next.js 15 + React 19
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        Web3 Library
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        Wagmi v2 + Viem
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        UI Components
                      </div>
                      <div className="font-mono text-xs text-foreground">
                        shadcn/ui
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground">
                Authentication Flow
              </h2>
              <p className="text-muted-foreground">
                From TOTP generation to on-chain verification
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-background to-muted/30">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </div>
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">User Device</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    TOTP code generated locally from secret
                  </p>
                  <div className="mt-3 rounded border border-border bg-background p-2 text-center font-mono text-sm font-bold text-foreground">
                    123456
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-muted/30">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </div>
                    <CircuitBoard className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">ZK Circuit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Proof generated without revealing secret
                  </p>
                  <div className="mt-3 rounded border border-border bg-background p-2">
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded bg-primary/30" />
                      <div className="h-1.5 w-3/4 rounded bg-primary/20" />
                      <div className="h-1.5 w-5/6 rounded bg-primary/10" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-muted/30">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </div>
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Smart Contract</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    On-chain verification without secret access
                  </p>
                  <div className="mt-3 rounded border border-border bg-background p-2 text-center">
                    <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-background to-muted/30">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      4
                    </div>
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Authorized and executed securely
                  </p>
                  <div className="mt-3 rounded border border-border bg-background p-2 text-center">
                    <ArrowRight className="mx-auto h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-foreground">
                Key Innovations
              </h2>
              <p className="text-lg text-muted-foreground">
                What makes ChronoVault different from other TOTP wallets
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Lock className="h-5 w-5" />
                  </div>
                  <CardTitle>Transaction-Bound Proofs</CardTitle>
                  <CardDescription>
                    Proofs are cryptographically tied to exact transaction
                    parameters (to, value, data, nonce)
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <CardTitle>Two-Device QR Authentication</CardTitle>
                  <CardDescription>
                    True 2FA with device separation—transaction device never
                    sees the secret
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <CardTitle>One-Time Use Protection</CardTitle>
                  <CardDescription>
                    Each time window (30 sec) can only be used once—prevents all
                    replay attacks
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle>Unlimited Lifespan</CardTitle>
                  <CardDescription>
                    On-demand TOTP in ZK circuits—no pre-computation, no wallet
                    expiration
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CircuitBoard className="h-5 w-5" />
                  </div>
                  <CardTitle>ZK-Friendly Hashing</CardTitle>
                  <CardDescription>
                    Poseidon hash (~1,200 constraints) vs SHA-1 (~40,000
                    constraints)
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle>ERC-4337 Native</CardTitle>
                  <CardDescription>
                    Smart contract wallet with programmable security and account
                    abstraction
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold text-foreground">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground">
                  Secure authentication without exposing secrets on-chain
                </p>
              </div>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      Transaction Commitment Calculation
                    </h3>
                    <p className="text-muted-foreground">
                      Frontend calculates commitment = hash(to, value, data,
                      nonce) % FIELD_PRIME, binding proof to exact transaction
                      parameters
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      Two-Device Proof Generation
                    </h3>
                    <p className="text-muted-foreground">
                      Authenticator device scans QR, generates ZK proof with
                      TOTP secret + commitment, displays proof as 3 auto-cycling
                      QR codes
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      On-Chain Verification
                    </h3>
                    <p className="text-muted-foreground">
                      Smart contract verifies proof's commitment matches actual
                      transaction—changing any parameter invalidates the proof
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      One-Time Use + Execution
                    </h3>
                    <p className="text-muted-foreground">
                      Time counter marked as used, preventing replay attacks.
                      Transaction executes only after all verifications pass
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-foreground">
                Technology Stack
              </h2>
              <p className="text-lg text-muted-foreground">
                Built with cutting-edge Web3 and cryptographic technologies
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Zero-Knowledge Circuits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Circom 2.2.1</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>snarkjs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Groth16 Proofs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Powers of Tau</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Smart Contracts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Solidity 0.8.28</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Hardhat 3.0</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Viem</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>ERC-4337</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Frontend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Next.js 15</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>React 19</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Wagmi v2</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Tailwind CSS</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-4xl font-bold text-foreground">
                What Makes This Different?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Unlike existing TOTP wallet solutions that pre-compute and hash
                future codes into Merkle trees, ChronoVault implements the
                actual TOTP algorithm (RFC 6238) inside zero-knowledge circuits.
              </p>
              <Card className="text-left">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">
                      Eliminates need for client-side storage of authentication
                      data
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">
                      Removes vulnerability of brute-forcing pre-hashed values
                      if client is compromised
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">
                      Provides true cryptographic proof of secret knowledge
                      rather than Merkle inclusion proofs
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">
                      Combines usability of Google Authenticator with genuine
                      zero-knowledge security
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="text-lg font-bold text-foreground">
                    ChronoVault
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bank-grade security for Web3 self-custody wallets
                </p>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Resources
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link
                      href="https://github.com/WhyAsh5114/ethonline-2025"
                      target="_blank"
                      className="transition-colors hover:text-foreground"
                    >
                      GitHub
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://eips.ethereum.org/EIPS/eip-4337"
                      target="_blank"
                      className="transition-colors hover:text-foreground"
                    >
                      ERC-4337
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://datatracker.ietf.org/doc/html/rfc6238"
                      target="_blank"
                      className="transition-colors hover:text-foreground"
                    >
                      RFC 6238
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Built With
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Next.js 15</li>
                  <li>Circom 2.2.1</li>
                  <li>Hardhat 3.0</li>
                  <li>Wagmi v2</li>
                </ul>
              </div>
            </div>
            <Separator className="my-8" />
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-muted-foreground">
                Built for ETHOnline 2025
              </p>
              <p className="text-sm text-muted-foreground">ISC License</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
