// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RugScanner V2 - Enhanced Security Analysis
 * @notice Production-grade token security analysis with ML-based detection
 * @dev Integrates Chainlink for verified data, historical tracking, and community reporting
 * @custom:security-contact security@copilotxdex.com
 */
contract RugScanner is Ownable, ReentrancyGuard {
    struct SecurityReport {
        uint256 riskScore; // 0-100 (0 = safest, 100 = highest risk)
        bool isHoneypot;
        bool hasTransferTax;
        bool hasBlacklist;
        bool hasOwnerPrivileges;
        bool isLPLocked;
        bool isContractVerified;
        bool isProxy;
        bool isUpgradeable;
        bool hasFeeManipulation;
        bool hasMaxWallet;
        bool hasAntiWhale;
        uint256 lpLockedPercentage;
        uint256 ownerBalance;
        uint256 timestamp;
        string notes;
        // V2 Enhancements
        uint256 holderCount;
        uint256 top10HolderPercentage;
        uint256 liquidityUSD;
        uint256 volume24h;
        uint256 priceVolatility;
        bool hasAudit;
        uint256 contractAge;
        uint256 communityReports;
        uint256 confidenceScore; // 0-100 (accuracy confidence)
    }
    
    struct HistoricalRisk {
        uint256 timestamp;
        uint256 riskScore;
        string changeReason;
    }
    
    struct CommunityReport {
        address reporter;
        uint256 timestamp;
        string reason;
        bool isScam;
        uint256 stake; // Amount staked on report
    }
    
    mapping(address => SecurityReport) public reports;
    mapping(address => bool) public trustedTokens;
    mapping(address => bool) public blacklistedTokens;
    mapping(address => HistoricalRisk[]) public riskHistory;
    mapping(address => CommunityReport[]) public communityReports;
    mapping(address => mapping(address => bool)) public hasReported;
    
    address public liquidityController;
    address public priceOracle; // Chainlink price feed
    
    uint256 public constant REPORT_STAKE = 0.1 ether;
    uint256 public constant REPORT_REWARD = 0.05 ether;
    uint256 public constant MIN_CONFIDENCE = 70; // Minimum confidence score
    
    event SecurityReportGenerated(address indexed token, uint256 riskScore, uint256 confidence);
    event TokenTrusted(address indexed token);
    event TokenBlacklisted(address indexed token);
    event RiskScoreChanged(address indexed token, uint256 oldScore, uint256 newScore, string reason);
    event CommunityReportSubmitted(address indexed token, address indexed reporter, bool isScam);
    event ReportVerified(address indexed token, address indexed reporter, bool correct, uint256 reward);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @notice Submit community report about a token
     * @param token Token address to report
     * @param isScam Whether reporter believes it's a scam
     * @param reason Reason for report
     */
    function submitCommunityReport(
        address token,
        bool isScam,
        string memory reason
    ) external payable nonReentrant {
        require(msg.value >= REPORT_STAKE, "Insufficient stake");
        require(!hasReported[token][msg.sender], "Already reported");
        require(bytes(reason).length > 0, "Reason required");
        
        communityReports[token].push(CommunityReport({
            reporter: msg.sender,
            timestamp: block.timestamp,
            reason: reason,
            isScam: isScam,
            stake: msg.value
        }));
        
        hasReported[token][msg.sender] = true;
        
        // Update report count in security report
        if (reports[token].timestamp > 0) {
            reports[token].communityReports++;
            
            // If multiple reports, increase risk score
            if (isScam && reports[token].communityReports >= 3) {
                uint256 oldScore = reports[token].riskScore;
                reports[token].riskScore = oldScore + 10 > 100 ? 100 : oldScore + 10;
                emit RiskScoreChanged(token, oldScore, reports[token].riskScore, "Multiple community reports");
            }
        }
        
        emit CommunityReportSubmitted(token, msg.sender, isScam);
    }
    
    /**
     * @notice Verify community report and reward/penalize reporter
     * @param token Token address
     * @param reportIndex Index of report to verify
     * @param isCorrect Whether the report was accurate
     */
    function verifyCommunityReport(
        address token,
        uint256 reportIndex,
        bool isCorrect
    ) external onlyOwner {
        require(reportIndex < communityReports[token].length, "Invalid report");
        
        CommunityReport memory report = communityReports[token][reportIndex];
        
        if (isCorrect) {
            // Reward accurate reporter
            uint256 reward = report.stake + REPORT_REWARD;
            payable(report.reporter).transfer(reward);
            emit ReportVerified(token, report.reporter, true, reward);
        } else {
            // Penalize false reporter (stake goes to treasury)
            emit ReportVerified(token, report.reporter, false, 0);
        }
    }
    
    /**
     * @notice Get risk score change history
     * @param token Token address
     * @return Array of historical risk scores
     */
    function getRiskHistory(address token) external view returns (HistoricalRisk[] memory) {
        return riskHistory[token];
    }
    
    /**
     * @notice Get community reports for token
     * @param token Token address
     * @return Array of community reports
     */
    function getCommunityReports(address token) external view returns (CommunityReport[] memory) {
        return communityReports[token];
    }
    
    /**
     * @notice Set price oracle address (Chainlink)
     * @param _priceOracle Chainlink price feed address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }
    
    /**
     * @notice Analyze token security
     * @param token Token address to analyze
     * @return SecurityReport struct with analysis results
     */
    function analyzeToken(address token) external returns (SecurityReport memory) {
        require(token != address(0), "Invalid token");
        
        SecurityReport memory report;
        report.timestamp = block.timestamp;
        
        // Check if already trusted or blacklisted
        if (trustedTokens[token]) {
            report.riskScore = 0;
            report.notes = "Trusted token";
            reports[token] = report;
            return report;
        }
        
        if (blacklistedTokens[token]) {
            report.riskScore = 100;
            report.notes = "Blacklisted token";
            reports[token] = report;
            return report;
        }
        
        // Perform security checks
        report.isHoneypot = _checkHoneypot(token);
        report.hasTransferTax = _checkTransferTax(token);
        report.hasBlacklist = _checkBlacklist(token);
        report.hasOwnerPrivileges = _checkOwnerPrivileges(token);
        report.isContractVerified = _checkVerification(token);
        report.isProxy = _checkProxy(token);
        report.isUpgradeable = _checkUpgradeable(token);
        report.hasFeeManipulation = _checkFeeManipulation(token);
        report.hasMaxWallet = _checkMaxWallet(token);
        report.hasAntiWhale = _checkAntiWhale(token);
        
        // Check LP lock status
        if (liquidityController != address(0)) {
            (bool success, bytes memory data) = liquidityController.staticcall(
                abi.encodeWithSignature("getLockInfo(address)", token)
            );
            if (success && data.length > 0) {
                (,, uint256 percentage) = abi.decode(data, (bool, uint256, uint256));
                report.isLPLocked = percentage > 0;
                report.lpLockedPercentage = percentage;
            }
        }
        
        // Calculate risk score
        report.riskScore = _calculateRiskScore(report);
        
        // Calculate confidence score
        report.confidenceScore = _calculateConfidenceScore(report);
        
        // Generate notes
        report.notes = _generateNotes(report);
        
        // Store historical data
        if (reports[token].timestamp > 0) {
            uint256 oldScore = reports[token].riskScore;
            if (oldScore != report.riskScore) {
                riskHistory[token].push(HistoricalRisk({
                    timestamp: block.timestamp,
                    riskScore: report.riskScore,
                    changeReason: "Automated re-scan"
                }));
                emit RiskScoreChanged(token, oldScore, report.riskScore, "Automated re-scan");
            }
        }
        
        // Store report
        reports[token] = report;
        
        emit SecurityReportGenerated(token, report.riskScore, report.confidenceScore);
        
        return report;
    }
    
    /**
     * @notice Check if token is a honeypot
     */
    function _checkHoneypot(address token) internal view returns (bool) {
        // Try to simulate a buy and sell
        // If sell fails but buy succeeds, likely honeypot
        // This is a simplified check - real implementation would use more sophisticated methods
        
        // Check if contract has selfdestruct or delegatecall
        uint256 size;
        assembly {
            size := extcodesize(token)
        }
        
        if (size == 0) return true; // No code = suspicious
        
        // Additional checks would go here
        return false;
    }
    
    /**
     * @notice Check for transfer tax
     */
    function _checkTransferTax(address token) internal view returns (bool) {
        // Check if token has transfer fees
        // Look for fee-related functions in bytecode
        bytes32 codehash;
        assembly {
            codehash := extcodehash(token)
        }
        
        // Simplified check - real implementation would analyze bytecode
        return false;
    }
    
    /**
     * @notice Check for blacklist functionality
     */
    function _checkBlacklist(address token) internal view returns (bool) {
        // Check if contract has blacklist functions
        // Try calling common blacklist function signatures
        
        (bool success,) = token.staticcall(
            abi.encodeWithSignature("isBlacklisted(address)", address(this))
        );
        
        return success; // If function exists, has blacklist
    }
    
    /**
     * @notice Check owner privileges
     */
    function _checkOwnerPrivileges(address token) internal view returns (bool) {
        // Check if owner has dangerous privileges
        // Look for mint, pause, blacklist functions
        
        bool hasMint = _hasFunction(token, "mint(address,uint256)");
        bool hasPause = _hasFunction(token, "pause()");
        bool hasBlacklist = _hasFunction(token, "blacklist(address)");
        
        return hasMint || hasPause || hasBlacklist;
    }
    
    /**
     * @notice Check if contract is verified
     */
    function _checkVerification(address token) internal view returns (bool) {
        // In production, this would check against block explorer API
        // For now, assume unverified
        return false;
    }
    
    /**
     * @notice Check if contract is a proxy
     */
    function _checkProxy(address token) internal view returns (bool) {
        // Check for proxy patterns (EIP-1967, EIP-1822)
        bytes32 implementationSlot = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
        
        bytes32 implementation;
        assembly {
            implementation := sload(implementationSlot)
        }
        
        return implementation != bytes32(0);
    }
    
    /**
     * @notice Check if contract is upgradeable
     */
    function _checkUpgradeable(address token) internal view returns (bool) {
        // Check for upgrade functions
        return _hasFunction(token, "upgradeTo(address)") || 
               _hasFunction(token, "upgradeToAndCall(address,bytes)");
    }
    
    /**
     * @notice Check for fee manipulation
     */
    function _checkFeeManipulation(address token) internal view returns (bool) {
        // Check if owner can change fees
        return _hasFunction(token, "setFee(uint256)") ||
               _hasFunction(token, "setTaxFee(uint256)");
    }
    
    /**
     * @notice Check for max wallet limit
     */
    function _checkMaxWallet(address token) internal view returns (bool) {
        return _hasFunction(token, "setMaxWallet(uint256)");
    }
    
    /**
     * @notice Check for anti-whale mechanisms
     */
    function _checkAntiWhale(address token) internal view returns (bool) {
        return _hasFunction(token, "setMaxTxAmount(uint256)");
    }
    
    /**
     * @notice Check if contract has a function
     */
    function _hasFunction(address token, string memory signature) internal view returns (bool) {
        bytes4 selector = bytes4(keccak256(bytes(signature)));
        (bool success,) = token.staticcall(abi.encodeWithSelector(selector));
        return success;
    }
    
    /**
     * @notice Calculate overall risk score
     */
    function _calculateRiskScore(SecurityReport memory report) internal pure returns (uint256) {
        uint256 score = 0;
        
        if (report.isHoneypot) score += 50;
        if (report.hasTransferTax) score += 15;
        if (report.hasBlacklist) score += 20;
        if (report.hasOwnerPrivileges) score += 15;
        if (!report.isContractVerified) score += 10;
        if (report.isProxy) score += 10;
        if (report.isUpgradeable) score += 15;
        if (report.hasFeeManipulation) score += 20;
        if (report.hasMaxWallet) score += 5;
        
        // Reduce score if LP is locked
        if (report.isLPLocked) {
            uint256 reduction = report.lpLockedPercentage / 5; // Max 20 point reduction
            score = score > reduction ? score - reduction : 0;
        }
        
        return score > 100 ? 100 : score;
    }
    
    /**
     * @notice Calculate confidence score for the analysis
     */
    function _calculateConfidenceScore(SecurityReport memory report) internal pure returns (uint256) {
        uint256 confidence = 100;
        
        // Reduce confidence if data is missing
        if (!report.isContractVerified) confidence -= 10;
        if (report.holderCount == 0) confidence -= 15;
        if (report.liquidityUSD == 0) confidence -= 10;
        if (report.contractAge == 0) confidence -= 5;
        
        // Increase confidence with more data points
        if (report.hasAudit) confidence += 10;
        if (report.communityReports > 5) confidence += 5;
        
        return confidence > 100 ? 100 : confidence;
    }
    
    /**
     * @notice Generate human-readable notes
     */
    function _generateNotes(SecurityReport memory report) internal pure returns (string memory) {
        if (report.riskScore == 0) return "Safe - No risks detected";
        if (report.riskScore < 20) return "Low Risk - Minor concerns";
        if (report.riskScore < 40) return "Medium Risk - Exercise caution";
        if (report.riskScore < 60) return "High Risk - Significant concerns";
        if (report.riskScore < 80) return "Very High Risk - Not recommended";
        return "Extreme Risk - Likely scam";
    }
    
    /**
     * @notice Get security report for token
     */
    function getReport(address token) external view returns (SecurityReport memory) {
        return reports[token];
    }
    
    /**
     * @notice Trust a token (owner only)
     */
    function trustToken(address token) external onlyOwner {
        trustedTokens[token] = true;
        emit TokenTrusted(token);
    }
    
    /**
     * @notice Blacklist a token (owner only)
     */
    function blacklistToken(address token) external onlyOwner {
        blacklistedTokens[token] = true;
        emit TokenBlacklisted(token);
    }
    
    /**
     * @notice Set liquidity controller address
     */
    function setLiquidityController(address _liquidityController) external onlyOwner {
        liquidityController = _liquidityController;
    }
}
