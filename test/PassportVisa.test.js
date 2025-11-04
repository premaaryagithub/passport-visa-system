const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Passport-Visa System", function () {
  let passportRegistry, visaManagement;
  let owner, citizen, officer;

  beforeEach(async function () {
    [owner, citizen, officer] = await ethers.getSigners();

    const PassportRegistry = await ethers.getContractFactory("PassportRegistry");
    passportRegistry = await PassportRegistry.deploy();
    await passportRegistry.waitForDeployment();

    const VisaManagement = await ethers.getContractFactory("VisaManagement");
    visaManagement = await VisaManagement.deploy(await passportRegistry.getAddress());
    await visaManagement.waitForDeployment();
  });

  it("Should allow citizen to apply for passport", async function () {
    await passportRegistry.connect(citizen).applyForPassport(
      "John Doe",
      "1990-01-01",
      "USA",
      "P123456",
      "QmHash"
    );

    const passportId = await passportRegistry.getPassportByHolder(citizen.address);
    expect(passportId).to.equal(1);
  });

  it("Should allow officer to issue passport", async function () {
    await passportRegistry.connect(citizen).applyForPassport(
      "John Doe",
      "1990-01-01",
      "USA",
      "P123456",
      "QmHash"
    );

    await passportRegistry.connect(owner).issuePassport(1, 10);
    const isValid = await passportRegistry.verifyPassport(1);
    expect(isValid).to.be.true;
  });

  it("Should allow citizen to apply for visa after passport approval", async function () {
    // Apply for passport
    await passportRegistry.connect(citizen).applyForPassport(
      "John Doe",
      "1990-01-01",
      "USA",
      "P123456",
      "QmHash"
    );

    // Issue passport
    await passportRegistry.connect(owner).issuePassport(1, 10);

    // Apply for visa
    await visaManagement.connect(citizen).applyForVisa(1, "France", 0);

    const visas = await visaManagement.getApplicantVisas(citizen.address);
    expect(visas.length).to.equal(1);
  });

  it("Should not allow visa application without valid passport", async function () {
    await expect(
      visaManagement.connect(citizen).applyForVisa(1, "France", 0)
    ).to.be.reverted;
  });
});
