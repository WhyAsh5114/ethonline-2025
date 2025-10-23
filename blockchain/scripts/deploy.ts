import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  console.log("\n🚀 Deploying TOTP contracts...\n");

  // Deploy MockEntryPoint
  console.log("📦 Deploying MockEntryPoint...");
  const entryPoint = await viem.deployContract("MockEntryPoint");
  console.log(`✅ MockEntryPoint deployed at: ${entryPoint.address}`);

  // Deploy TOTPVerifier
  console.log("\n📦 Deploying TOTPVerifier...");
  const verifier = await viem.deployContract("TOTPVerifier");
  console.log(`✅ TOTPVerifier deployed at: ${verifier.address}`);

  // Get network info
  const chainId = await publicClient.getChainId();
  const networkName = Number(chainId) === 11155111 ? "sepolia" : "hardhat";

  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`EntryPoint: ${entryPoint.address}`);
  console.log(`Verifier: ${verifier.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Update frontend contract addresses
  const frontendConfigPath = path.join(
    __dirname,
    "../../frontend/src/lib/contract-addresses.ts",
  );

  // Read the current config
  let config = fs.readFileSync(frontendConfigPath, "utf8");

  // Determine which network to update (sepolia or hardhat)
  const networkKey = networkName === "sepolia" ? "sepolia" : "hardhat";

  // Update the addresses
  config = config.replace(
    new RegExp(`(${networkKey}:\\s*{[^}]*entryPoint:\\s*")([^"]*)(")`),
    `$1${entryPoint.address}$3`,
  );
  config = config.replace(
    new RegExp(`(${networkKey}:\\s*{[^}]*verifier:\\s*")([^"]*)(")`),
    `$1${verifier.address}$3`,
  );

  // Write back
  fs.writeFileSync(frontendConfigPath, config);

  console.log("✅ Updated frontend contract addresses\n");

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      entryPoint: entryPoint.address,
      verifier: verifier.address,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${networkName}-${Date.now()}.json`,
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`💾 Deployment info saved to: ${deploymentFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
