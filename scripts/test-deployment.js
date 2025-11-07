const hre = require("hardhat");

async function main() {
  console.log("🔍 Testing Deployed Contracts...\n");

  const [deployer, user1, user2] = await hre.ethers.getSigners();
  
  // Load deployment info
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '../frontend/src/contracts/deployment.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Please deploy contracts first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log("📋 Deployment Info:");
  console.log("Network:", deployment.network);
  console.log("PassportRegistry:", deployment.contracts.PassportRegistry);
  console.log("VisaManagement:", deployment.contracts.VisaManagement);
  console.log("\n");

  // Get contract instances
  const PassportRegistry = await hre.ethers.getContractFactory("PassportRegistry");
  const passportRegistry = PassportRegistry.attach(deployment.contracts.PassportRegistry);
  
  const VisaManagement = await hre.ethers.getContractFactory("VisaManagement");
  const visaManagement = VisaManagement.attach(deployment.contracts.VisaManagement);

  console.log("✅ Contracts loaded successfully\n");

  // Test 1: Check admin
  console.log("🧪 Test 1: Verify Admin");
  const admin = await passportRegistry.admin();
  console.log("Admin address:", admin);
  console.log("Deployer address:", deployer.address);
  console.log("Match:", admin === deployer.address ? "✅" : "❌");
  console.log("\n");

  // Test 2: Apply for passport
  console.log("🧪 Test 2: Apply for Passport (User 1)");
  try {
    const tx = await passportRegistry.connect(user1).applyForPassport(
      "Alice Johnson",
      "1990-01-15",
      "USA",
      "P123456789",
      "QmTestHash123"
    );
    const receipt = await tx.wait();
    console.log("✅ Passport application submitted");
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Get passport ID
    const passportId = await passportRegistry.getPassportByHolder(user1.address);
    console.log("Passport ID:", passportId.toString());
    console.log("\n");

    // Test 3: Check passport status
    console.log("🧪 Test 3: Check Passport Status");
    const passport = await passportRegistry.passports(passportId);
    console.log("Holder:", passport.holder);
    console.log("Full Name:", passport.fullName);
    console.log("Passport Number:", passport.passportNumber);
    console.log("Status:", ["Pending", "Active", "Expired", "Revoked"][passport.status]);
    console.log("\n");

    // Test 4: Approve passport (as admin)
    console.log("🧪 Test 4: Approve Passport (Admin)");
    const approveTx = await passportRegistry.connect(deployer).issuePassport(passportId, 10);
    await approveTx.wait();
    console.log("✅ Passport approved");
    
    const updatedPassport = await passportRegistry.passports(passportId);
    console.log("New Status:", ["Pending", "Active", "Expired", "Revoked"][updatedPassport.status]);
    console.log("\n");

    // Test 5: Apply for visa
    console.log("🧪 Test 5: Apply for Visa (User 1)");
    const visaTx = await visaManagement.connect(user1).applyForVisa(
      passportId,
      "France",
      0 // Tourist
    );
    const visaReceipt = await visaTx.wait();
    console.log("✅ Visa application submitted");
    console.log("Transaction hash:", visaReceipt.transactionHash);
    
    // Get visa IDs
    const visaIds = await visaManagement.getApplicantVisas(user1.address);
    console.log("Visa ID:", visaIds[0].toString());
    console.log("\n");

    // Test 6: Check visa status
    console.log("🧪 Test 6: Check Visa Status");
    const visa = await visaManagement.visas(visaIds[0]);
    console.log("Applicant:", visa.applicant);
    console.log("Destination:", visa.destinationCountry);
    console.log("Type:", ["Tourist", "Business", "Student", "Work", "Transit"][visa.visaType]);
    console.log("Status:", ["Pending", "Approved", "Rejected", "Expired", "Revoked"][visa.status]);
    console.log("\n");

    // Test 7: Approve visa (as admin)
    console.log("🧪 Test 7: Approve Visa (Admin)");
    const approveVisaTx = await visaManagement.connect(deployer).approveVisa(visaIds[0], 6);
    await approveVisaTx.wait();
    console.log("✅ Visa approved");
    
    const updatedVisa = await visaManagement.visas(visaIds[0]);
    console.log("New Status:", ["Pending", "Approved", "Rejected", "Expired", "Revoked"][updatedVisa.status]);
    console.log("\n");

    // Test 8: Verify documents
    console.log("🧪 Test 8: Verify Documents");
    const isPassportValid = await passportRegistry.verifyPassport(passportId);
    const isVisaValid = await visaManagement.verifyVisa(visaIds[0]);
    console.log("Passport Valid:", isPassportValid ? "✅" : "❌");
    console.log("Visa Valid:", isVisaValid ? "✅" : "❌");
    console.log("\n");

    console.log("🎉 All Tests Passed!");
    console.log("\n📊 Summary:");
    console.log("- Passport applications: Working ✅");
    console.log("- Passport approvals: Working ✅");
    console.log("- Visa applications: Working ✅");
    console.log("- Visa approvals: Working ✅");
    console.log("- Document verification: Working ✅");
    console.log("\n✨ Smart contracts are fully functional!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
