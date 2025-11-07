import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wallet, FileText, Globe, Users, LogOut, ArrowLeft, Check, X } from 'lucide-react';
import './App.css';
import { connectWallet as connectWeb3Wallet, getBalance, getCurrentNetwork } from './utils/web3';
import {
  applyForPassport,
  getPassportByHolder,
  getPassportDetails,
  issuePassport,
  revokePassport as revokePassportContract,
  applyForVisa,
  getVisasByApplicant,
  getVisaDetails,
  approveVisa as approveVisaContract,
  rejectVisa as rejectVisaContract,
  isAuthorizedPassportOfficer,
  isAuthorizedVisaOfficer,
  VisaType
} from './utils/contractInteractions';

// Web3 Integration Component
const PassportVisaSystem = () => {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState('citizen');
  const [activeTab, setActiveTab] = useState('passport');
  const [passportData, setPassportData] = useState(null);
  const [visaApplications, setVisaApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [balance, setBalance] = useState('0');
  const [network, setNetwork] = useState(null);
  
  // Real-time data for officer dashboards (starts empty)
  const [allPassportApplications, setAllPassportApplications] = useState([]);
  const [allVisaApplications, setAllVisaApplications] = useState([]);

  // Form states
  const [passportForm, setPassportForm] = useState({
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    ipfsHash: ''
  });

  const [visaForm, setVisaForm] = useState({
    destinationCountry: '',
    visaType: '0'
  });

  // Officer dashboard states
  const [passportIdLookup, setPassportIdLookup] = useState('');
  const [visaIdLookup, setVisaIdLookup] = useState('');
  const [lookedUpPassport, setLookedUpPassport] = useState(null);
  const [lookedUpVisa, setLookedUpVisa] = useState(null);
  const [isOfficer, setIsOfficer] = useState(false);

  // Connect Wallet - uses cached provider to prevent repeated eth_requestAccounts
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const address = await connectWeb3Wallet();
        setAccount(address);
        setIsConnected(true);
        
        // Check if this account is an officer (Account #0 from Hardhat)
        // Account #0 address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        const officerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        setIsOfficer(address.toLowerCase() === officerAddress.toLowerCase());
        
        showNotification('success', 'Wallet connected successfully!');
        
        // Load user's passport and visa data
        await loadUserData(address);
      } catch (error) {
        showNotification('error', 'Failed to connect wallet: ' + error.message);
      }
    } else {
      showNotification('error', 'Please install MetaMask!');
    }
  };
  
  // Load user data from blockchain
  const loadUserData = async (address) => {
    try {
      setLoading(true);
      
      // Load passport data (returns null if user has no passport)
      const passport = await getPassportByHolder(address);
      if (passport) {
        setPassportData({
          ...passport,
          appliedDate: passport.issueDate > 0 
            ? new Date(passport.issueDate * 1000).toLocaleDateString()
            : 'Pending'
        });
      } else {
        setPassportData(null); // No passport yet
      }
      
      // Load visa applications (returns empty array if user has no visas)
      const visas = await getVisasByApplicant(address);
      if (visas && visas.length > 0) {
        setVisaApplications(visas.map(visa => ({
          id: visa.visaId,
          destinationCountry: visa.destinationCountry,
          visaType: visa.visaType,
          visaTypeName: visa.visaTypeString,
          status: visa.statusString,
          appliedDate: new Date(visa.applicationDate * 1000).toLocaleDateString()
        })));
      } else {
        setVisaApplications([]); // No visas yet
      }
      
    } catch (error) {
      // Silently handle errors - user likely has no data yet
      console.log('Loading user data (new user or no applications yet)');
      setPassportData(null);
      setVisaApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setAccount('');
    setIsConnected(false);
    setUserRole('citizen');
    setActiveTab('passport');
    setPassportData(null);
    setVisaApplications([]);
    showNotification('success', 'Wallet disconnected successfully!');
  };

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
  };

  // Handle passport form submission - BLOCKCHAIN INTEGRATED
  const handlePassportSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await applyForPassport(
        passportForm.fullName,
        passportForm.dateOfBirth,
        passportForm.nationality,
        passportForm.passportNumber,
        passportForm.ipfsHash
      );
      
      showNotification('success', `Passport application submitted! ID: ${result.passportId}`);
      
      // Reload user data to get updated passport
      await loadUserData(account);
      
      // Reset form
      setPassportForm({
        fullName: '',
        dateOfBirth: '',
        nationality: '',
        passportNumber: '',
        ipfsHash: ''
      });
    } catch (error) {
      showNotification('error', 'Failed to submit application: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle visa form submission - BLOCKCHAIN INTEGRATED
  const handleVisaSubmit = async (e) => {
    e.preventDefault();
    
    if (!passportData || passportData.statusString !== 'Active') {
      showNotification('error', 'You need an active passport to apply for visa');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await applyForVisa(
        passportData.passportId,
        visaForm.destinationCountry,
        parseInt(visaForm.visaType)
      );
      
      showNotification('success', `Visa application submitted! ID: ${result.visaId}`);
      
      // Reload user data to get updated visas
      await loadUserData(account);
      
      setVisaForm({
        destinationCountry: '',
        visaType: '0'
      });
    } catch (error) {
      showNotification('error', 'Failed to submit visa application: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Approve Passport - BLOCKCHAIN INTEGRATED
  const approvePassport = async (passportId) => {
    setLoading(true);
    try {
      await issuePassport(passportId, 10); // 10 years validity
      showNotification('success', 'Passport approved successfully!');
      // Reload data if needed
    } catch (error) {
      showNotification('error', 'Failed to approve passport: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Reject Passport - BLOCKCHAIN INTEGRATED
  const rejectPassport = async (passportId) => {
    setLoading(true);
    try {
      await revokePassportContract(passportId, 'Application rejected by officer');
      showNotification('success', 'Passport rejected!');
    } catch (error) {
      showNotification('error', 'Failed to reject passport: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Approve Visa - BLOCKCHAIN INTEGRATED
  const approveVisa = async (visaId) => {
    setLoading(true);
    try {
      await approveVisaContract(visaId, 6); // 6 months validity
      showNotification('success', 'Visa approved successfully!');
    } catch (error) {
      showNotification('error', 'Failed to approve visa: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Reject Visa - BLOCKCHAIN INTEGRATED
  const rejectVisa = async (visaId) => {
    setLoading(true);
    try {
      await rejectVisaContract(visaId, 'Application rejected by officer');
      showNotification('success', 'Visa rejected!');
    } catch (error) {
      showNotification('error', 'Failed to reject visa: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Lookup Passport by ID - FOR OFFICERS
  const lookupPassport = async () => {
    if (!passportIdLookup || passportIdLookup.trim() === '') {
      showNotification('error', 'Please enter a Passport ID');
      return;
    }
    
    setLoading(true);
    try {
      const passport = await getPassportDetails(parseInt(passportIdLookup));
      if (passport) {
        setLookedUpPassport(passport);
        showNotification('success', 'Passport found!');
      } else {
        setLookedUpPassport(null);
        showNotification('error', 'Passport not found');
      }
    } catch (error) {
      setLookedUpPassport(null);
      showNotification('error', 'Error looking up passport: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Lookup Visa by ID - FOR OFFICERS
  const lookupVisa = async () => {
    if (!visaIdLookup || visaIdLookup.trim() === '') {
      showNotification('error', 'Please enter a Visa ID');
      return;
    }
    
    setLoading(true);
    try {
      const visa = await getVisaDetails(parseInt(visaIdLookup));
      if (visa) {
        setLookedUpVisa(visa);
        showNotification('success', 'Visa found!');
      } else {
        setLookedUpVisa(null);
        showNotification('error', 'Visa not found');
      }
    } catch (error) {
      setLookedUpVisa(null);
      showNotification('error', 'Error looking up visa: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Active': 'bg-green-100 text-green-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Expired': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Passport-Visa Blockchain System</h1>
                <p className="text-sm text-gray-600">
                  {network ? `${network.name} (Chain ID: ${network.chainId})` : 'Hardhat Local'}
                  {network && network.chainId !== 31337 && (
                    <span className="text-red-600 font-semibold ml-2">⚠️ Wrong Network!</span>
                  )}
                </p>
              </div>
            </div>
            
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Wallet className="h-5 w-5" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
                  <div className="text-xs font-semibold">Balance</div>
                  <div className="text-sm font-bold">
                    {parseFloat(balance).toFixed(4)} ETH
                  </div>
                </div>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  title="Disconnect Wallet"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification.show && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg flex items-center space-x-3 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isConnected ? (
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Role Selector - Only visible for Officer Account */}
          {isOfficer && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role (Officer Account Only)
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="citizen">Citizen</option>
                <option value="passport-officer">Passport Officer</option>
                <option value="visa-officer">Visa Officer</option>
                <option value="border-control">Border Control</option>
              </select>
            </div>
          )}

          {userRole === 'citizen' && (
            <>
              {/* Tab Navigation */}
              <div className="bg-white rounded-lg shadow-md mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('passport')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 ${
                        activeTab === 'passport'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="inline h-5 w-5 mr-2" />
                      Passport
                    </button>
                    <button
                      onClick={() => setActiveTab('visa')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 ${
                        activeTab === 'visa'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Globe className="inline h-5 w-5 mr-2" />
                      Visa
                    </button>
                  </nav>
                </div>
              </div>

              {/* Passport Tab */}
              {activeTab === 'passport' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Application Form */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Apply for Passport</h2>
                    <form onSubmit={handlePassportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={passportForm.fullName}
                          onChange={(e) => setPassportForm({...passportForm, fullName: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={passportForm.dateOfBirth}
                          onChange={(e) => setPassportForm({...passportForm, dateOfBirth: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                        <input
                          type="text"
                          value={passportForm.nationality}
                          onChange={(e) => setPassportForm({...passportForm, nationality: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                        <input
                          type="text"
                          value={passportForm.passportNumber}
                          onChange={(e) => setPassportForm({...passportForm, passportNumber: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IPFS Hash (Documents)</label>
                        <input
                          type="text"
                          value={passportForm.ipfsHash}
                          onChange={(e) => setPassportForm({...passportForm, ipfsHash: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="QmXxx..."
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 font-medium"
                      >
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </form>
                  </div>

                  {/* Passport Status */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Your Passport</h2>
                    {passportData ? (
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-600">Status</p>
                          <StatusBadge status={passportData.statusString} />
                        </div>
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium">{passportData.fullName}</p>
                        </div>
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-600">Passport Number</p>
                          <p className="font-medium">{passportData.passportNumber}</p>
                        </div>
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-600">Nationality</p>
                          <p className="font-medium">{passportData.nationality}</p>
                        </div>
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-600">Date of Birth</p>
                          <p className="font-medium">{passportData.dateOfBirth}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Applied/Issue Date</p>
                          <p className="font-medium">{passportData.appliedDate}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No passport application yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Visa Tab */}
              {activeTab === 'visa' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Visa Application Form */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Apply for Visa</h2>
                    <form onSubmit={handleVisaSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
                        <input
                          type="text"
                          value={visaForm.destinationCountry}
                          onChange={(e) => setVisaForm({...visaForm, destinationCountry: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                        <select
                          value={visaForm.visaType}
                          onChange={(e) => setVisaForm({...visaForm, visaType: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="0">Tourist</option>
                          <option value="1">Business</option>
                          <option value="2">Student</option>
                          <option value="3">Work</option>
                          <option value="4">Transit</option>
                        </select>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading || !passportData}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 font-medium"
                      >
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                      
                      {!passportData && (
                        <p className="text-sm text-amber-600 text-center">Apply for passport first</p>
                      )}
                    </form>
                  </div>

                  {/* Visa Applications List */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Your Visa Applications</h2>
                    {visaApplications.length > 0 ? (
                      <div className="space-y-4">
                        {visaApplications.map((visa) => (
                          <div key={visa.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium">{visa.destinationCountry}</h3>
                              <StatusBadge status={visa.status} />
                            </div>
                            <p className="text-sm text-gray-600">Type: {visa.visaTypeName}</p>
                            <p className="text-sm text-gray-600">Applied: {visa.appliedDate}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Globe className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No visa applications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Passport Officer Dashboard */}
          {userRole === 'passport-officer' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Passport Officer Dashboard</h2>
                </div>
                <button
                  onClick={() => setUserRole('citizen')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Citizen</span>
                </button>
              </div>
              
              {/* Lookup Passport by ID */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lookup Passport Application</h3>
                <div className="flex space-x-4">
                  <input
                    type="number"
                    placeholder="Enter Passport ID (e.g., 1)"
                    value={passportIdLookup}
                    onChange={(e) => setPassportIdLookup(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={lookupPassport}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {/* Display Looked Up Passport */}
              {lookedUpPassport && (
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{lookedUpPassport.fullName}</h4>
                      <p className="text-sm text-gray-600">Passport ID: {lookedUpPassport.passportId}</p>
                    </div>
                    <StatusBadge status={lookedUpPassport.statusString} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Date of Birth</p>
                      <p className="font-medium">{lookedUpPassport.dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="font-medium">{lookedUpPassport.nationality}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Passport Number</p>
                      <p className="font-medium">{lookedUpPassport.passportNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Holder Address</p>
                      <p className="font-medium text-xs">{lookedUpPassport.holder.substring(0, 10)}...</p>
                    </div>
                  </div>

                  {lookedUpPassport.statusString === 'Pending' && (
                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={() => approvePassport(lookedUpPassport.passportId)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        <Check className="h-5 w-5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => rejectPassport(lookedUpPassport.passportId)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                      >
                        <X className="h-5 w-5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!lookedUpPassport && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <FileText className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    1. Get the Passport ID from the citizen's notification (shown after they apply)
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    2. Enter the Passport ID in the field above and click "Lookup"
                  </p>
                  <p className="text-sm text-blue-700">
                    3. Review the application and click "Approve" or "Reject"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Visa Officer Dashboard */}
          {userRole === 'visa-officer' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Globe className="h-8 w-8 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Visa Officer Dashboard</h2>
                </div>
                <button
                  onClick={() => setUserRole('citizen')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Citizen</span>
                </button>
              </div>
              
              {/* Lookup Visa by ID */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lookup Visa Application</h3>
                <div className="flex space-x-4">
                  <input
                    type="number"
                    placeholder="Enter Visa ID (e.g., 1)"
                    value={visaIdLookup}
                    onChange={(e) => setVisaIdLookup(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={lookupVisa}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {/* Display Looked Up Visa */}
              {lookedUpVisa && (
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{lookedUpVisa.destinationCountry}</h4>
                      <p className="text-sm text-gray-600">Visa ID: {lookedUpVisa.visaId}</p>
                    </div>
                    <StatusBadge status={lookedUpVisa.statusString} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Visa Type</p>
                      <p className="font-medium">{lookedUpVisa.visaTypeString}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Passport ID</p>
                      <p className="font-medium">{lookedUpVisa.passportId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Applicant Address</p>
                      <p className="font-medium text-xs">{lookedUpVisa.applicant.substring(0, 10)}...</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Application Date</p>
                      <p className="font-medium text-xs">
                        {new Date(lookedUpVisa.applicationDate * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {lookedUpVisa.statusString === 'Pending' && (
                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={() => approveVisa(lookedUpVisa.visaId)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        <Check className="h-5 w-5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => rejectVisa(lookedUpVisa.visaId)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                      >
                        <X className="h-5 w-5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!lookedUpVisa && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <Globe className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    1. Get the Visa ID from the citizen's notification (shown after they apply)
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    2. Enter the Visa ID in the field above and click "Lookup"
                  </p>
                  <p className="text-sm text-blue-700">
                    3. Review the application and click "Approve" or "Reject"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Border Control Dashboard */}
          {userRole === 'border-control' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Border Control Dashboard</h2>
                </div>
                <button
                  onClick={() => setUserRole('citizen')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Citizen</span>
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <Users className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Border Control Dashboard</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Verify passports and visas using their IDs from the blockchain.
                </p>
                <p className="text-xs text-blue-600">
                  Note: Full dashboard with all records requires event indexing (The Graph) or backend service.
                  For now, use Passport/Visa IDs to verify documents directly via smart contract calls.
                </p>
              </div>
            </div>
          )}
        </main>
      ) : (
        <div className="max-w-md mx-auto mt-20 bg-white rounded-lg shadow-md p-8 text-center">
          <Wallet className="h-16 w-16 mx-auto text-indigo-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Connect your MetaMask wallet to access the Passport-Visa Blockchain System</p>
          <button
            onClick={connectWallet}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Connect MetaMask
          </button>
        </div>
      )}
    </div>
  );
};

export default PassportVisaSystem;
