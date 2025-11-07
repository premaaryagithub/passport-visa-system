import { getPassportContract, getVisaContract } from './web3';

// Passport Status Enum (matches Solidity)
export const PassportStatus = {
  Pending: 0,
  Active: 1,
  Expired: 2,
  Revoked: 3
};

// Visa Status Enum (matches Solidity)
export const VisaStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Expired: 3,
  Revoked: 4
};

// Visa Type Enum (matches Solidity)
export const VisaType = {
  Tourist: 0,
  Business: 1,
  Student: 2,
  Work: 3,
  Transit: 4
};

// Helper to convert status number to string
export const getPassportStatusString = (status) => {
  const statusMap = ['Pending', 'Active', 'Expired', 'Revoked'];
  return statusMap[status] || 'Unknown';
};

export const getVisaStatusString = (status) => {
  const statusMap = ['Pending', 'Approved', 'Rejected', 'Expired', 'Revoked'];
  return statusMap[status] || 'Unknown';
};

export const getVisaTypeString = (type) => {
  const typeMap = ['Tourist', 'Business', 'Student', 'Work', 'Transit'];
  return typeMap[type] || 'Unknown';
};

// ==================== PASSPORT FUNCTIONS ====================

export const applyForPassport = async (fullName, dateOfBirth, nationality, passportNumber, ipfsHash = '') => {
  try {
    const contract = await getPassportContract();
    
    // Send transaction with explicit gas settings for local network
    const tx = await contract.applyForPassport(
      fullName,
      dateOfBirth,
      nationality,
      passportNumber,
      ipfsHash,
      {
        gasLimit: 500000 // Explicit gas limit for local network
      }
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    // Extract passport ID from event
    const event = receipt.events?.find(e => e.event === 'PassportApplied');
    const passportId = event?.args?.passportId;
    
    return { success: true, passportId: passportId?.toNumber(), receipt };
  } catch (error) {
    console.error('Error applying for passport:', error);
    throw error;
  }
};

export const getPassportByHolder = async (holderAddress) => {
  try {
    const contract = await getPassportContract();
    const passportId = await contract.getPassportByHolder(holderAddress);
    
    if (passportId.toNumber() === 0) {
      return null; // User doesn't have a passport yet
    }
    
    return await getPassportDetails(passportId.toNumber());
  } catch (error) {
    // Silently handle the case where user has no passport
    console.log('No passport found for this address (this is normal for new users)');
    return null;
  }
};

export const getPassportDetails = async (passportId) => {
  try {
    const contract = await getPassportContract();
    const passport = await contract.passports(passportId);
    
    if (!passport.exists) {
      return null;
    }
    
    return {
      passportId: passport.passportId.toNumber(),
      holder: passport.holder,
      fullName: passport.fullName,
      dateOfBirth: passport.dateOfBirth,
      nationality: passport.nationality,
      passportNumber: passport.passportNumber,
      issueDate: passport.issueDate.toNumber(),
      expiryDate: passport.expiryDate.toNumber(),
      status: passport.status,
      statusString: getPassportStatusString(passport.status),
      ipfsHash: passport.ipfsHash,
      exists: passport.exists
    };
  } catch (error) {
    console.error('Error getting passport details:', error);
    throw error;
  }
};

export const issuePassport = async (passportId, validityYears = 10) => {
  try {
    const contract = await getPassportContract();
    const tx = await contract.issuePassport(passportId, validityYears);
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error('Error issuing passport:', error);
    throw error;
  }
};

export const revokePassport = async (passportId, reason) => {
  try {
    const contract = await getPassportContract();
    const tx = await contract.revokePassport(passportId, reason);
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error('Error revoking passport:', error);
    throw error;
  }
};

export const verifyPassport = async (passportId) => {
  try {
    const contract = await getPassportContract();
    const isValid = await contract.verifyPassport(passportId);
    return isValid;
  } catch (error) {
    console.error('Error verifying passport:', error);
    return false;
  }
};

export const isAuthorizedPassportOfficer = async (address) => {
  try {
    const contract = await getPassportContract();
    return await contract.isAuthorizedOfficer(address);
  } catch (error) {
    console.error('Error checking passport officer authorization:', error);
    return false;
  }
};

// ==================== VISA FUNCTIONS ====================

export const applyForVisa = async (passportId, destinationCountry, visaType) => {
  try {
    const contract = await getVisaContract();
    
    // Send transaction with explicit gas settings
    const tx = await contract.applyForVisa(
      passportId, 
      destinationCountry, 
      visaType,
      {
        gasLimit: 500000 // Explicit gas limit for local network
      }
    );
    
    console.log('Visa transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Visa transaction confirmed!');
    
    // Extract visa ID from event
    const event = receipt.events?.find(e => e.event === 'VisaApplied');
    const visaId = event?.args?.visaId;
    
    return { success: true, visaId: visaId?.toNumber(), receipt };
  } catch (error) {
    console.error('Error applying for visa:', error);
    throw error;
  }
};

export const getVisasByApplicant = async (applicantAddress) => {
  try {
    const contract = await getVisaContract();
    const visaIds = await contract.getApplicantVisas(applicantAddress);
    
    if (visaIds.length === 0) {
      return []; // User has no visas yet
    }
    
    const visas = await Promise.all(
      visaIds.map(async (id) => {
        return await getVisaDetails(id.toNumber());
      })
    );
    
    return visas.filter(v => v !== null);
  } catch (error) {
    // Silently handle the case where user has no visas
    console.log('No visas found for this address (this is normal for new users)');
    return [];
  }
};

export const getVisaDetails = async (visaId) => {
  try {
    const contract = await getVisaContract();
    const visa = await contract.visas(visaId);
    
    if (!visa.exists) {
      return null;
    }
    
    return {
      visaId: visa.visaId.toNumber(),
      passportId: visa.passportId.toNumber(),
      applicant: visa.applicant,
      destinationCountry: visa.destinationCountry,
      visaType: visa.visaType,
      visaTypeString: getVisaTypeString(visa.visaType),
      applicationDate: visa.applicationDate.toNumber(),
      issueDate: visa.issueDate.toNumber(),
      expiryDate: visa.expiryDate.toNumber(),
      status: visa.status,
      statusString: getVisaStatusString(visa.status),
      approvedBy: visa.approvedBy,
      rejectionReason: visa.rejectionReason,
      exists: visa.exists
    };
  } catch (error) {
    console.error('Error getting visa details:', error);
    throw error;
  }
};

export const approveVisa = async (visaId, validityMonths = 6) => {
  try {
    const contract = await getVisaContract();
    const tx = await contract.approveVisa(visaId, validityMonths);
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error('Error approving visa:', error);
    throw error;
  }
};

export const rejectVisa = async (visaId, reason) => {
  try {
    const contract = await getVisaContract();
    const tx = await contract.rejectVisa(visaId, reason);
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error('Error rejecting visa:', error);
    throw error;
  }
};

export const revokeVisa = async (visaId, reason) => {
  try {
    const contract = await getVisaContract();
    const tx = await contract.revokeVisa(visaId, reason);
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error('Error revoking visa:', error);
    throw error;
  }
};

export const verifyVisa = async (visaId) => {
  try {
    const contract = await getVisaContract();
    const isValid = await contract.verifyVisa(visaId);
    return isValid;
  } catch (error) {
    console.error('Error verifying visa:', error);
    return false;
  }
};

export const isAuthorizedVisaOfficer = async (address) => {
  try {
    const contract = await getVisaContract();
    return await contract.isAuthorizedOfficer(address);
  } catch (error) {
    console.error('Error checking visa officer authorization:', error);
    return false;
  }
};

// ==================== EVENT LISTENERS ====================

export const listenToPassportEvents = (callback) => {
  getPassportContract().then(contract => {
    contract.on('PassportApplied', (passportId, holder, passportNumber, event) => {
      callback({
        type: 'PassportApplied',
        passportId: passportId.toNumber(),
        holder,
        passportNumber,
        event
      });
    });
    
    contract.on('PassportIssued', (passportId, holder, event) => {
      callback({
        type: 'PassportIssued',
        passportId: passportId.toNumber(),
        holder,
        event
      });
    });
  });
};

export const listenToVisaEvents = (callback) => {
  getVisaContract().then(contract => {
    contract.on('VisaApplied', (visaId, passportId, destinationCountry, event) => {
      callback({
        type: 'VisaApplied',
        visaId: visaId.toNumber(),
        passportId: passportId.toNumber(),
        destinationCountry,
        event
      });
    });
    
    contract.on('VisaApproved', (visaId, approver, event) => {
      callback({
        type: 'VisaApproved',
        visaId: visaId.toNumber(),
        approver,
        event
      });
    });
  });
};
