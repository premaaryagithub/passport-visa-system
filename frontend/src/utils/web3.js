import { ethers } from 'ethers';

// This file will be used once contracts are deployed
// Update the contract addresses after deployment

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  throw new Error("Please install MetaMask");
};

export const getSigner = async () => {
  const provider = getProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
};

export const getPassportContract = async () => {
  const signer = await getSigner();
  // Import the ABI and deployment info after contracts are deployed
  // const PassportRegistryABI = require('../contracts/PassportRegistry.json');
  // const deploymentInfo = require('../contracts/deployment.json');
  
  // return new ethers.Contract(
  //   deploymentInfo.contracts.PassportRegistry,
  //   PassportRegistryABI,
  //   signer
  // );
  
  throw new Error("Contracts not deployed yet. Please deploy contracts first.");
};

export const getVisaContract = async () => {
  const signer = await getSigner();
  // Import the ABI and deployment info after contracts are deployed
  // const VisaManagementABI = require('../contracts/VisaManagement.json');
  // const deploymentInfo = require('../contracts/deployment.json');
  
  // return new ethers.Contract(
  //   deploymentInfo.contracts.VisaManagement,
  //   VisaManagementABI,
  //   signer
  // );
  
  throw new Error("Contracts not deployed yet. Please deploy contracts first.");
};

export const connectWallet = async () => {
  try {
    const signer = await getSigner();
    const address = await signer.getAddress();
    return address;
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};
