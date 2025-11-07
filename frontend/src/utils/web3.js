import { ethers } from 'ethers';
import PassportRegistryABI from '../contracts/PassportRegistry.json';
import VisaManagementABI from '../contracts/VisaManagement.json';
import deploymentInfo from '../contracts/deployment.json';

let provider = null;
let signer = null;

export const getProvider = () => {
  if (!provider && window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
  }
  if (!provider) {
    throw new Error("Please install MetaMask");
  }
  return provider;
};

export const getSigner = async () => {
  if (!signer) {
    const prov = getProvider();
    signer = prov.getSigner();
  }
  return signer;
};

export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask");
    }
    
    // First, try to switch to Hardhat Local network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69',
            chainName: 'Hardhat Local',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            }
          }]
        });
      } else {
        throw switchError;
      }
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    // Reset provider and signer to get fresh instances
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    // Verify we're on the correct network
    const network = await provider.getNetwork();
    if (network.chainId !== 31337) {
      throw new Error("Please switch MetaMask to Hardhat Local network (Chain ID: 31337)");
    }
    
    const address = await signer.getAddress();
    return address;
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

export const getPassportContract = async () => {
  const signerInstance = await getSigner();
  
  if (!deploymentInfo.contracts.PassportRegistry) {
    throw new Error("PassportRegistry contract not deployed. Please run deployment first.");
  }
  
  return new ethers.Contract(
    deploymentInfo.contracts.PassportRegistry,
    PassportRegistryABI,
    signerInstance
  );
};

export const getVisaContract = async () => {
  const signerInstance = await getSigner();
  
  if (!deploymentInfo.contracts.VisaManagement) {
    throw new Error("VisaManagement contract not deployed. Please run deployment first.");
  }
  
  return new ethers.Contract(
    deploymentInfo.contracts.VisaManagement,
    VisaManagementABI,
    signerInstance
  );
};

export const getContractAddresses = () => {
  return deploymentInfo.contracts;
};

export const getNetwork = () => {
  return deploymentInfo.network;
};

export const getBalance = async (address) => {
  try {
    const prov = getProvider();
    const balance = await prov.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};

export const getCurrentNetwork = async () => {
  try {
    const prov = getProvider();
    const network = await prov.getNetwork();
    return {
      chainId: network.chainId,
      name: network.name
    };
  } catch (error) {
    console.error('Error getting network:', error);
    return null;
  }
};
