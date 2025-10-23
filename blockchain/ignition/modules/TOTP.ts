import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TOTPModule = buildModule("TOTPModule", (m) => {
  // Deploy MockEntryPoint first
  const entryPoint = m.contract("MockEntryPoint");

  // Deploy TOTPVerifier
  const verifier = m.contract("TOTPVerifier");

  return { entryPoint, verifier };
});

export default TOTPModule;
