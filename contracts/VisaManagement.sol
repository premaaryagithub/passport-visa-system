// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPassportRegistry {
    function verifyPassport(uint256 _passportId) external view returns (bool);
    function passports(uint256 _passportId) external view returns (
        uint256, address, string memory, string memory, string memory, 
        string memory, uint256, uint256, uint8, string memory, bool
    );
}

contract VisaManagement {
    
    // Visa status and types
    enum VisaStatus { Pending, Approved, Rejected, Expired, Revoked }
    enum VisaType { Tourist, Business, Student, Work, Transit }
    
    // Visa structure
    struct Visa {
        uint256 visaId;
        uint256 passportId;
        address applicant;
        string destinationCountry;
        VisaType visaType;
        uint256 applicationDate;
        uint256 issueDate;
        uint256 expiryDate;
        VisaStatus status;
        address approvedBy;
        string rejectionReason;
        bool exists;
    }
    
    // State variables
    address public admin;
    IPassportRegistry public passportRegistry;
    uint256 public visaCounter;
    
    // Mappings
    mapping(uint256 => Visa) public visas;
    mapping(address => uint256[]) public applicantVisas;
    mapping(address => bool) public authorizedVisaOfficers;
    mapping(uint256 => mapping(string => uint256)) public passportCountryVisa; // passportId => country => visaId
    
    // Events
    event VisaApplied(uint256 indexed visaId, uint256 indexed passportId, string destinationCountry);
    event VisaApproved(uint256 indexed visaId, address indexed approver);
    event VisaRejected(uint256 indexed visaId, string reason);
    event VisaRevoked(uint256 indexed visaId, string reason);
    event VisaOfficerAuthorized(address indexed officer);
    event VisaOfficerRevoked(address indexed officer);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyAuthorizedOfficer() {
        require(authorizedVisaOfficers[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }
    
    modifier visaExists(uint256 _visaId) {
        require(visas[_visaId].exists, "Visa does not exist");
        _;
    }
    
    constructor(address _passportRegistryAddress) {
        admin = msg.sender;
        passportRegistry = IPassportRegistry(_passportRegistryAddress);
        authorizedVisaOfficers[msg.sender] = true;
        visaCounter = 0;
    }
    
    // Authorize visa officer
    function authorizeVisaOfficer(address _officer) external onlyAdmin {
        require(_officer != address(0), "Invalid address");
        authorizedVisaOfficers[_officer] = true;
        emit VisaOfficerAuthorized(_officer);
    }
    
    // Revoke visa officer authorization
    function revokeVisaOfficer(address _officer) external onlyAdmin {
        authorizedVisaOfficers[_officer] = false;
        emit VisaOfficerRevoked(_officer);
    }
    
    // Apply for visa
    function applyForVisa(
        uint256 _passportId,
        string memory _destinationCountry,
        VisaType _visaType
    ) external returns (uint256) {
        // Verify passport is valid
        require(passportRegistry.verifyPassport(_passportId), "Invalid or expired passport");
        
        // Get passport holder
        (, address holder, , , , , , , , , ) = passportRegistry.passports(_passportId);
        require(holder == msg.sender, "Not passport holder");
        
        // Check if already has active visa for this country
        uint256 existingVisaId = passportCountryVisa[_passportId][_destinationCountry];
        if (existingVisaId > 0) {
            Visa memory existingVisa = visas[existingVisaId];
            require(
                existingVisa.status == VisaStatus.Rejected || 
                existingVisa.status == VisaStatus.Expired ||
                existingVisa.status == VisaStatus.Revoked,
                "Active visa already exists for this country"
            );
        }
        
        visaCounter++;
        
        Visa memory newVisa = Visa({
            visaId: visaCounter,
            passportId: _passportId,
            applicant: msg.sender,
            destinationCountry: _destinationCountry,
            visaType: _visaType,
            applicationDate: block.timestamp,
            issueDate: 0,
            expiryDate: 0,
            status: VisaStatus.Pending,
            approvedBy: address(0),
            rejectionReason: "",
            exists: true
        });
        
        visas[visaCounter] = newVisa;
        applicantVisas[msg.sender].push(visaCounter);
        passportCountryVisa[_passportId][_destinationCountry] = visaCounter;
        
        emit VisaApplied(visaCounter, _passportId, _destinationCountry);
        
        return visaCounter;
    }
    
    // Approve visa
    function approveVisa(uint256 _visaId, uint256 _validityMonths) 
        external 
        onlyAuthorizedOfficer 
        visaExists(_visaId) 
    {
        Visa storage visa = visas[_visaId];
        require(visa.status == VisaStatus.Pending, "Visa not in pending status");
        require(_validityMonths > 0 && _validityMonths <= 120, "Invalid validity period");
        
        // Verify passport is still valid
        require(passportRegistry.verifyPassport(visa.passportId), "Passport no longer valid");
        
        visa.status = VisaStatus.Approved;
        visa.issueDate = block.timestamp;
        visa.expiryDate = block.timestamp + (_validityMonths * 30 days);
        visa.approvedBy = msg.sender;
        
        emit VisaApproved(_visaId, msg.sender);
    }
    
    // Reject visa
    function rejectVisa(uint256 _visaId, string memory _reason) 
        external 
        onlyAuthorizedOfficer 
        visaExists(_visaId) 
    {
        Visa storage visa = visas[_visaId];
        require(visa.status == VisaStatus.Pending, "Visa not in pending status");
        require(bytes(_reason).length > 0, "Rejection reason required");
        
        visa.status = VisaStatus.Rejected;
        visa.rejectionReason = _reason;
        
        emit VisaRejected(_visaId, _reason);
    }
    
    // Revoke visa
    function revokeVisa(uint256 _visaId, string memory _reason) 
        external 
        onlyAuthorizedOfficer 
        visaExists(_visaId) 
    {
        Visa storage visa = visas[_visaId];
        require(visa.status == VisaStatus.Approved, "Can only revoke approved visas");
        
        visa.status = VisaStatus.Revoked;
        visa.rejectionReason = _reason;
        
        emit VisaRevoked(_visaId, _reason);
    }
    
    // Update expired visas
    function updateExpiredStatus(uint256 _visaId) external visaExists(_visaId) {
        Visa storage visa = visas[_visaId];
        require(visa.status == VisaStatus.Approved, "Visa not approved");
        require(block.timestamp > visa.expiryDate, "Visa not yet expired");
        
        visa.status = VisaStatus.Expired;
    }
    
    // Get visa details
    function getVisa(uint256 _visaId) 
        external 
        view 
        visaExists(_visaId) 
        returns (
            uint256 passportId,
            address applicant,
            string memory destinationCountry,
            VisaType visaType,
            uint256 issueDate,
            uint256 expiryDate,
            VisaStatus status
        ) 
    {
        Visa memory visa = visas[_visaId];
        return (
            visa.passportId,
            visa.applicant,
            visa.destinationCountry,
            visa.visaType,
            visa.issueDate,
            visa.expiryDate,
            visa.status
        );
    }
    
    // Get all visas for an applicant
    function getApplicantVisas(address _applicant) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return applicantVisas[_applicant];
    }
    
    // Verify visa validity
    function verifyVisa(uint256 _visaId) 
        external 
        view 
        visaExists(_visaId) 
        returns (bool isValid) 
    {
        Visa memory visa = visas[_visaId];
        return (
            visa.status == VisaStatus.Approved &&
            block.timestamp < visa.expiryDate &&
            passportRegistry.verifyPassport(visa.passportId)
        );
    }
    
    // Get visa by passport and country
    function getVisaByPassportAndCountry(uint256 _passportId, string memory _country) 
        external 
        view 
        returns (uint256) 
    {
        return passportCountryVisa[_passportId][_country];
    }
    
    // Check if address is authorized officer
    function isAuthorizedOfficer(address _address) external view returns (bool) {
        return authorizedVisaOfficers[_address];
    }
}
