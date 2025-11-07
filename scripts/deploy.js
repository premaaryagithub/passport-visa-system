const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy PassportRegistry
  console.log("\nDeploying PassportRegistry...");
  const PassportRegistry = await hre.ethers.getContractFactory("PassportRegistry");
  const passportRegistry = await PassportRegistry.deploy();
  await passportRegistry.waitForDeployment();
  const passportAddress = await passportRegistry.getAddress();
  console.log("PassportRegistry deployed to:", passportAddress);

  // Deploy VisaManagement
  console.log("\nDeploying VisaManagement...");
  const VisaManagement = await hre.ethers.getContractFactory("VisaManagement");
  const visaManagement = await VisaManagement.deploy(passportAddress);
  await visaManagement.waitForDeployment();
  const visaAddress = await visaManagement.getAddress();
  console.log("VisaManagement deployed to:", visaAddress);

  // Wait for block confirmations (reduced for local network)
  console.log("\nWaiting for block confirmations...");
  await passportRegistry.deploymentTransaction().wait(1);
  await visaManagement.deploymentTransaction().wait(1);

  // Verify contracts on Etherscan (if API key is provided)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: passportAddress,
        constructorArguments: [],
      });
      console.log("PassportRegistry verified!");
    } catch (error) {
      console.log("PassportRegistry verification error:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: visaAddress,
        constructorArguments: [passportAddress],
      });
      console.log("VisaManagement verified!");
    } catch (error) {
      console.log("VisaManagement verification error:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      PassportRegistry: passportAddress,
      VisaManagement: visaAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Save to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentDir = path.join(__dirname, '../frontend/src/contracts');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentDir, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to frontend/src/contracts/deployment.json");
  
  // Copy ABIs
  const artifactsDir = path.join(__dirname, '../artifacts/contracts');
  
  const passportArtifact = require(path.join(artifactsDir, 'PassportRegistry.sol/PassportRegistry.json'));
  fs.writeFileSync(
    path.join(deploymentDir, 'PassportRegistry.json'),
    JSON.stringify(passportArtifact.abi, null, 2)
  );
  
  const visaArtifact = require(path.join(artifactsDir, 'VisaManagement.sol/VisaManagement.json'));
  fs.writeFileSync(
    path.join(deploymentDir, 'VisaManagement.json'),
    JSON.stringify(visaArtifact.abi, null, 2)
  );
  
  console.log("ABIs copied to frontend/src/contracts/");
  console.log("\n✅ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
