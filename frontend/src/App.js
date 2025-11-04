import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Wallet, FileText, Globe, Users, LogOut, ArrowLeft, Check, X } from 'lucide-react';
import './App.css';

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

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setIsConnected(true);
        showNotification('success', 'Wallet connected successfully!');
      } catch (error) {
        showNotification('error', 'Failed to connect wallet: ' + error.message);
      }
    } else {
      showNotification('error', 'Please install MetaMask!');
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

  // Handle passport form submission
  const handlePassportSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulating blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newPassportData = {
        ...passportForm,
        status: 'Pending',
        appliedDate: new Date().toLocaleDateString()
      };
      
      // Add to citizen's passport view
      setPassportData(newPassportData);
      
      // Add to officer dashboard (so it appears in Passport Officer Dashboard)
      const officerPassportRecord = {
        id: Date.now(),
        fullName: passportForm.fullName,
        passportNumber: passportForm.passportNumber,
        nationality: passportForm.nationality,
        dateOfBirth: passportForm.dateOfBirth,
        status: 'Pending',
        appliedDate: new Date().toLocaleDateString()
      };
      setAllPassportApplications([...allPassportApplications, officerPassportRecord]);
      
      showNotification('success', 'Passport application submitted successfully!');
      
      // Reset form
      setPassportForm({
        fullName: '',
        dateOfBirth: '',
        nationality: '',
        passportNumber: '',
        ipfsHash: ''
      });
    } catch (error) {
      showNotification('error', 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Handle visa form submission
  const handleVisaSubmit = async (e) => {
    e.preventDefault();
    
    if (!passportData || passportData.status !== 'Active') {
      showNotification('error', 'You need an active passport to apply for visa');
      return;
    }
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newVisa = {
        id: Date.now(),
        ...visaForm,
        status: 'Pending',
        appliedDate: new Date().toLocaleDateString(),
        visaTypeName: ['Tourist', 'Business', 'Student', 'Work', 'Transit'][visaForm.visaType]
      };
      
      // Add to citizen's visa view
      setVisaApplications([...visaApplications, newVisa]);
      
      // Add to officer dashboard (so it appears in Visa Officer Dashboard)
      const officerVisaRecord = {
        id: Date.now(),
        applicantName: passportData.fullName,
        passportNumber: passportData.passportNumber,
        destinationCountry: visaForm.destinationCountry,
        visaType: ['Tourist', 'Business', 'Student', 'Work', 'Transit'][visaForm.visaType],
        status: 'Pending',
        appliedDate: new Date().toLocaleDateString()
      };
      setAllVisaApplications([...allVisaApplications, officerVisaRecord]);
      
      showNotification('success', 'Visa application submitted successfully!');
      
      setVisaForm({
        destinationCountry: '',
        visaType: '0'
      });
    } catch (error) {
      showNotification('error', 'Failed to submit visa application');
    } finally {
      setLoading(false);
    }
  };

  // Approve Passport
  const approvePassport = (id) => {
    // Update in officer dashboard
    setAllPassportApplications(allPassportApplications.map(app => 
      app.id === id ? { ...app, status: 'Active' } : app
    ));
    
    // Also update citizen's passport view if it matches
    const approvedApp = allPassportApplications.find(app => app.id === id);
    if (passportData && approvedApp && passportData.passportNumber === approvedApp.passportNumber) {
      setPassportData({ ...passportData, status: 'Active' });
    }
    
    showNotification('success', 'Passport approved successfully!');
  };

  // Reject Passport
  const rejectPassport = (id) => {
    // Update in officer dashboard
    setAllPassportApplications(allPassportApplications.map(app => 
      app.id === id ? { ...app, status: 'Rejected' } : app
    ));
    
    // Also update citizen's passport view if it matches
    const rejectedApp = allPassportApplications.find(app => app.id === id);
    if (passportData && rejectedApp && passportData.passportNumber === rejectedApp.passportNumber) {
      setPassportData({ ...passportData, status: 'Rejected' });
    }
    
    showNotification('success', 'Passport rejected!');
  };

  // Approve Visa
  const approveVisa = (id) => {
    // Update in officer dashboard
    setAllVisaApplications(allVisaApplications.map(app => 
      app.id === id ? { ...app, status: 'Approved' } : app
    ));
    
    // Also update citizen's visa view if it matches
    setVisaApplications(visaApplications.map(visa => 
      visa.id === id ? { ...visa, status: 'Approved' } : visa
    ));
    
    showNotification('success', 'Visa approved successfully!');
  };

  // Reject Visa
  const rejectVisa = (id) => {
    // Update in officer dashboard
    setAllVisaApplications(allVisaApplications.map(app => 
      app.id === id ? { ...app, status: 'Rejected' } : app
    ));
    
    // Also update citizen's visa view if it matches
    setVisaApplications(visaApplications.map(visa => 
      visa.id === id ? { ...visa, status: 'Rejected' } : visa
    ));
    
    showNotification('success', 'Visa rejected!');
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
                <p className="text-sm text-gray-600">Sepolia Testnet</p>
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
          {/* Role Selector */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
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
                          <StatusBadge status={passportData.status} />
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
                          <p className="text-sm text-gray-600">Applied Date</p>
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
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Pending Passport Applications</h3>
                {allPassportApplications.filter(app => app.status === 'Pending').length > 0 ? (
                  allPassportApplications.filter(app => app.status === 'Pending').map(app => (
                    <div key={app.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{app.fullName}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p><span className="font-medium">Passport #:</span> {app.passportNumber}</p>
                            <p><span className="font-medium">Nationality:</span> {app.nationality}</p>
                            <p><span className="font-medium">Applied:</span> {app.appliedDate}</p>
                            <p><StatusBadge status={app.status} /></p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => approvePassport(app.id)}
                            className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => rejectPassport(app.id)}
                            className="flex items-center space-x-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No pending applications</p>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-700 mt-8">All Passport Records</h3>
                <div className="space-y-3">
                  {allPassportApplications.map(app => (
                    <div key={app.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{app.fullName}</p>
                          <p className="text-sm text-gray-600">{app.passportNumber} • {app.nationality}</p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Pending Visa Applications</h3>
                {allVisaApplications.filter(app => app.status === 'Pending').length > 0 ? (
                  allVisaApplications.filter(app => app.status === 'Pending').map(app => (
                    <div key={app.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{app.applicantName}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p><span className="font-medium">Passport #:</span> {app.passportNumber}</p>
                            <p><span className="font-medium">Destination:</span> {app.destinationCountry}</p>
                            <p><span className="font-medium">Type:</span> {app.visaType}</p>
                            <p><span className="font-medium">Applied:</span> {app.appliedDate}</p>
                            <p><StatusBadge status={app.status} /></p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => approveVisa(app.id)}
                            className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => rejectVisa(app.id)}
                            className="flex items-center space-x-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Globe className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No pending visa applications</p>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-700 mt-8">All Visa Records</h3>
                <div className="space-y-3">
                  {allVisaApplications.map(app => (
                    <div key={app.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{app.applicantName} → {app.destinationCountry}</p>
                          <p className="text-sm text-gray-600">{app.visaType} Visa • {app.passportNumber}</p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
              
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">Document Verification</h3>
                  <p className="text-sm text-indigo-700">Verify passports and visas at border checkpoints</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                      Active Passports
                    </h4>
                    <div className="space-y-2">
                      {allPassportApplications.filter(app => app.status === 'Active').map(app => (
                        <div key={app.id} className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">{app.fullName}</p>
                              <p className="text-xs text-gray-600">{app.passportNumber}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-green-700">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">Valid</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {allPassportApplications.filter(app => app.status === 'Active').length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No active passports</p>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Globe className="h-5 w-5 mr-2 text-indigo-600" />
                      Approved Visas
                    </h4>
                    <div className="space-y-2">
                      {allVisaApplications.filter(app => app.status === 'Approved').map(app => (
                        <div key={app.id} className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">{app.applicantName}</p>
                              <p className="text-xs text-gray-600">{app.destinationCountry} • {app.visaType}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-green-700">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">Valid</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {allVisaApplications.filter(app => app.status === 'Approved').length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No approved visas</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Quick Statistics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{allPassportApplications.length}</p>
                      <p className="text-sm text-gray-600">Total Passports</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {allPassportApplications.filter(app => app.status === 'Active').length}
                      </p>
                      <p className="text-sm text-gray-600">Active Passports</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {allVisaApplications.filter(app => app.status === 'Approved').length}
                      </p>
                      <p className="text-sm text-gray-600">Approved Visas</p>
                    </div>
                  </div>
                </div>
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
