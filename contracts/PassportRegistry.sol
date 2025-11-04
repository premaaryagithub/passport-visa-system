// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PassportRegistry {
    
    // Passport status enum
    enum PassportStatus { Pending, Active, Expired, Revoked }
    
    // Passport structure
    struct Passport {
        uint256 passportId;
        address holder;
        string fullName;
        string dateOfBirth;
        string nationality;
        string passportNumber;
        uint256 issueDate;
        uint256 expiryDate;
        PassportStatus status;
        string ipfsHash; // For storing photo/documents
        bool exists;
    }
    
    // State variables
    address public admin;
    uint256 public passportCounter;
    
    // Mappings
    mapping(uint256 => Passport) public passports;
    mapping(address => uint256) public holderToPassportId;
    mapping(string => bool) public passportNumberExists;
    mapping(address => bool) public authorizedOfficers;
    
    // Events
    event PassportApplied(uint256 indexed passportId, address indexed holder, string passportNumber);
    event PassportIssued(uint256 indexed passportId, address indexed holder);
    event PassportRevoked(uint256 indexed passportId, string reason);
    event PassportUpdated(uint256 indexed passportId);
    event OfficerAuthorized(address indexed officer);
    event OfficerRevoked(address indexed officer);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyAuthorizedOfficer() {
        require(authorizedOfficers[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }
    
    modifier passportExists(uint256 _passportId) {
        require(passports[_passportId].exists, "Passport does not exist");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        authorizedOfficers[msg.sender] = true;
        passportCounter = 0;
    }
    
    // Authorize officer
    function authorizeOfficer(address _officer) external onlyAdmin {
        require(_officer != address(0), "Invalid address");
        authorizedOfficers[_officer] = true;
        emit OfficerAuthorized(_officer);
    }
    
    // Revoke officer authorization
    function revokeOfficer(address _officer) external onlyAdmin {
        authorizedOfficers[_officer] = false;
        emit OfficerRevoked(_officer);
    }
    
    // Apply for passport (by citizen)
    function applyForPassport(
        string memory _fullName,
        string memory _dateOfBirth,
        string memory _nationality,
        string memory _passportNumber,
        string memory _ipfsHash
    ) external returns (uint256) {
        require(holderToPassportId[msg.sender] == 0, "Already has a passport");
        require(!passportNumberExists[_passportNumber], "Passport number already exists");
        require(bytes(_fullName).length > 0, "Name required");
        
        passportCounter++;
        
        Passport memory newPassport = Passport({
            passportId: passportCounter,
            holder: msg.sender,
            fullName: _fullName,
            dateOfBirth: _dateOfBirth,
            nationality: _nationality,
            passportNumber: _passportNumber,
            issueDate: 0,
            expiryDate: 0,
            status: PassportStatus.Pending,
            ipfsHash: _ipfsHash,
            exists: true
        });
        
        passports[passportCounter] = newPassport;
        holderToPassportId[msg.sender] = passportCounter;
        passportNumberExists[_passportNumber] = true;
        
        emit PassportApplied(passportCounter, msg.sender, _passportNumber);
        
        return passportCounter;
    }
    
    // Issue passport (by officer)
    function issuePassport(uint256 _passportId, uint256 _validityYears) 
        external 
        onlyAuthorizedOfficer 
        passportExists(_passportId) 
    {
        Passport storage passport = passports[_passportId];
        require(passport.status == PassportStatus.Pending, "Passport not pending");
        
        passport.status = PassportStatus.Active;
        passport.issueDate = block.timestamp;
        passport.expiryDate = block.timestamp + (_validityYears * 365 days);
        
        emit PassportIssued(_passportId, passport.holder);
    }
    
    // Revoke passport
    function revokePassport(uint256 _passportId, string memory _reason) 
        external 
        onlyAuthorizedOfficer 
        passportExists(_passportId) 
    {
        Passport storage passport = passports[_passportId];
        passport.status = PassportStatus.Revoked;
        
        emit PassportRevoked(_passportId, _reason);
    }
    
    // Update passport status to expired
    function updateExpiredStatus(uint256 _passportId) 
        external 
        passportExists(_passportId) 
    {
        Passport storage passport = passports[_passportId];
        require(block.timestamp > passport.expiryDate, "Passport not yet expired");
        passport.status = PassportStatus.Expired;
        
        emit PassportUpdated(_passportId);
    }
    
    // Get passport details
    function getPassport(uint256 _passportId) 
        external 
        view 
        passportExists(_passportId) 
        returns (
            address holder,
            string memory fullName,
            string memory nationality,
            string memory passportNumber,
            uint256 issueDate,
            uint256 expiryDate,
            PassportStatus status
        ) 
    {
        Passport memory passport = passports[_passportId];
        return (
            passport.holder,
            passport.fullName,
            passport.nationality,
            passport.passportNumber,
            passport.issueDate,
            passport.expiryDate,
            passport.status
        );
    }
    
    // Get passport by holder address
    function getPassportByHolder(address _holder) 
        external 
        view 
        returns (uint256) 
    {
        return holderToPassportId[_holder];
    }
    
    // Verify passport validity
    function verifyPassport(uint256 _passportId) 
        external 
        view 
        passportExists(_passportId) 
        returns (bool isValid) 
    {
        Passport memory passport = passports[_passportId];
        return (
            passport.status == PassportStatus.Active &&
            block.timestamp < passport.expiryDate
        );
    }
    
    // Check if address is authorized officer
    function isAuthorizedOfficer(address _address) external view returns (bool) {
        return authorizedOfficers[_address];
    }
}
