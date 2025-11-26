/**
 * AI Risk Scoring Engine
 * Analyzes tokens and provides 0-100 risk scores
 */

export interface RiskFactors {
  honeypot: number;
  transferTax: number;
  blacklist: number;
  ownerPrivileges: number;
  lpLocked: number;
  contractVerified: number;
  proxy: number;
  upgradeable: number;
  feeManipulation: number;
  maxWallet: number;
  holderDistribution: number;
  liquidityDepth: number;
  tradingVolume: number;
  priceVolatility: number;
  socialSignals: number;
}

export interface RiskReport {
  overallScore: number; // 0-100 (0 = safest)
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  factors: RiskFactors;
  warnings: string[];
  recommendations: string[];
  summary: string;
  timestamp: number;
}

export class RiskScorer {
  /**
   * Calculate comprehensive risk score for a token
   */
  static async analyzeToken(
    tokenAddress: string,
    onChainData: any,
    socialData?: any
  ): Promise<RiskReport> {
    const factors: RiskFactors = {
      honeypot: this.checkHoneypot(onChainData),
      transferTax: this.checkTransferTax(onChainData),
      blacklist: this.checkBlacklist(onChainData),
      ownerPrivileges: this.checkOwnerPrivileges(onChainData),
      lpLocked: this.checkLPLocked(onChainData),
      contractVerified: this.checkContractVerified(onChainData),
      proxy: this.checkProxy(onChainData),
      upgradeable: this.checkUpgradeable(onChainData),
      feeManipulation: this.checkFeeManipulation(onChainData),
      maxWallet: this.checkMaxWallet(onChainData),
      holderDistribution: this.analyzeHolderDistribution(onChainData),
      liquidityDepth: this.analyzeLiquidityDepth(onChainData),
      tradingVolume: this.analyzeTradingVolume(onChainData),
      priceVolatility: this.analyzePriceVolatility(onChainData),
      socialSignals: this.analyzeSocialSignals(socialData),
    };

    const overallScore = this.calculateOverallScore(factors);
    const riskLevel = this.determineRiskLevel(overallScore);
    const warnings = this.generateWarnings(factors);
    const recommendations = this.generateRecommendations(factors);
    const summary = this.generateSummary(overallScore, riskLevel, factors);

    return {
      overallScore,
      riskLevel,
      factors,
      warnings,
      recommendations,
      summary,
      timestamp: Date.now(),
    };
  }

  /**
   * Check for honeypot characteristics
   */
  private static checkHoneypot(data: any): number {
    let score = 0;
    
    // Check if sells are blocked
    if (data.sellBlocked) score += 50;
    
    // Check for suspicious transfer restrictions
    if (data.transferRestrictions) score += 30;
    
    // Check for hidden mint functions
    if (data.hiddenMint) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Check for transfer tax
   */
  private static checkTransferTax(data: any): number {
    const tax = data.transferTax || 0;
    
    if (tax === 0) return 0;
    if (tax <= 5) return 10;
    if (tax <= 10) return 25;
    if (tax <= 20) return 50;
    return 100;
  }

  /**
   * Check for blacklist functionality
   */
  private static checkBlacklist(data: any): number {
    if (!data.hasBlacklist) return 0;
    
    // Check if blacklist is actively used
    if (data.blacklistedAddresses > 0) return 50;
    
    // Has blacklist but not used yet
    return 20;
  }

  /**
   * Check owner privileges
   */
  private static checkOwnerPrivileges(data: any): number {
    let score = 0;
    
    if (data.canMint) score += 20;
    if (data.canPause) score += 15;
    if (data.canBlacklist) score += 20;
    if (data.canChangeFees) score += 15;
    if (data.hasOwnership && !data.ownershipRenounced) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Check LP lock status
   */
  private static checkLPLocked(data: any): number {
    const lockedPercentage = data.lpLockedPercentage || 0;
    
    if (lockedPercentage >= 90) return 0;
    if (lockedPercentage >= 70) return 10;
    if (lockedPercentage >= 50) return 30;
    if (lockedPercentage >= 25) return 50;
    return 100;
  }

  /**
   * Check contract verification
   */
  private static checkContractVerified(data: any): number {
    return data.isVerified ? 0 : 30;
  }

  /**
   * Check if contract is a proxy
   */
  private static checkProxy(data: any): number {
    return data.isProxy ? 20 : 0;
  }

  /**
   * Check if contract is upgradeable
   */
  private static checkUpgradeable(data: any): number {
    return data.isUpgradeable ? 30 : 0;
  }

  /**
   * Check for fee manipulation
   */
  private static checkFeeManipulation(data: any): number {
    if (!data.canChangeFees) return 0;
    
    // Check if fees have been changed recently
    if (data.recentFeeChanges > 3) return 50;
    if (data.recentFeeChanges > 0) return 25;
    
    return 15;
  }

  /**
   * Check for max wallet restrictions
   */
  private static checkMaxWallet(data: any): number {
    if (!data.hasMaxWallet) return 0;
    
    const maxWalletPercent = data.maxWalletPercent || 100;
    
    if (maxWalletPercent >= 10) return 0;
    if (maxWalletPercent >= 5) return 10;
    if (maxWalletPercent >= 2) return 20;
    return 30;
  }

  /**
   * Analyze holder distribution
   */
  private static analyzeHolderDistribution(data: any): number {
    const topHolderPercent = data.topHolderPercent || 0;
    const top10Percent = data.top10Percent || 0;
    
    let score = 0;
    
    // Single holder concentration
    if (topHolderPercent > 50) score += 50;
    else if (topHolderPercent > 30) score += 30;
    else if (topHolderPercent > 20) score += 15;
    
    // Top 10 holders concentration
    if (top10Percent > 80) score += 30;
    else if (top10Percent > 60) score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * Analyze liquidity depth
   */
  private static analyzeLiquidityDepth(data: any): number {
    const liquidityUSD = data.liquidityUSD || 0;
    
    if (liquidityUSD >= 100000) return 0;
    if (liquidityUSD >= 50000) return 10;
    if (liquidityUSD >= 10000) return 25;
    if (liquidityUSD >= 1000) return 50;
    return 100;
  }

  /**
   * Analyze trading volume
   */
  private static analyzeTradingVolume(data: any): number {
    const volume24h = data.volume24h || 0;
    const liquidity = data.liquidityUSD || 1;
    const volumeToLiquidityRatio = volume24h / liquidity;
    
    // Healthy ratio is 0.1 - 2.0
    if (volumeToLiquidityRatio >= 0.1 && volumeToLiquidityRatio <= 2.0) return 0;
    if (volumeToLiquidityRatio < 0.01) return 30; // Too low
    if (volumeToLiquidityRatio > 5.0) return 40; // Suspiciously high
    
    return 15;
  }

  /**
   * Analyze price volatility
   */
  private static analyzePriceVolatility(data: any): number {
    const volatility = data.volatility24h || 0;
    
    if (volatility <= 10) return 0;
    if (volatility <= 25) return 10;
    if (volatility <= 50) return 25;
    if (volatility <= 100) return 50;
    return 75;
  }

  /**
   * Analyze social signals
   */
  private static analyzeSocialSignals(data: any): number {
    if (!data) return 20; // No social data = slight risk
    
    let score = 0;
    
    if (!data.hasWebsite) score += 10;
    if (!data.hasTwitter) score += 10;
    if (!data.hasTelegram) score += 5;
    if (data.twitterFollowers < 100) score += 15;
    if (data.telegramMembers < 50) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate overall risk score
   */
  private static calculateOverallScore(factors: RiskFactors): number {
    const weights = {
      honeypot: 0.25,
      transferTax: 0.10,
      blacklist: 0.10,
      ownerPrivileges: 0.10,
      lpLocked: 0.15,
      contractVerified: 0.05,
      proxy: 0.05,
      upgradeable: 0.05,
      feeManipulation: 0.05,
      maxWallet: 0.02,
      holderDistribution: 0.08,
      liquidityDepth: 0.10,
      tradingVolume: 0.05,
      priceVolatility: 0.05,
      socialSignals: 0.05,
    };

    let weightedScore = 0;
    for (const [key, value] of Object.entries(factors)) {
      weightedScore += value * (weights[key as keyof RiskFactors] || 0);
    }

    return Math.round(Math.min(weightedScore, 100));
  }

  /**
   * Determine risk level from score
   */
  private static determineRiskLevel(score: number): RiskReport['riskLevel'] {
    if (score <= 20) return 'SAFE';
    if (score <= 40) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'EXTREME';
  }

  /**
   * Generate warnings based on risk factors
   */
  private static generateWarnings(factors: RiskFactors): string[] {
    const warnings: string[] = [];

    if (factors.honeypot > 30) warnings.push('⚠️ Potential honeypot detected - selling may be restricted');
    if (factors.transferTax > 20) warnings.push('⚠️ High transfer tax detected');
    if (factors.blacklist > 30) warnings.push('⚠️ Blacklist functionality present and active');
    if (factors.ownerPrivileges > 40) warnings.push('⚠️ Owner has dangerous privileges');
    if (factors.lpLocked > 50) warnings.push('⚠️ Liquidity is not adequately locked');
    if (factors.holderDistribution > 40) warnings.push('⚠️ Highly concentrated holder distribution');
    if (factors.liquidityDepth > 50) warnings.push('⚠️ Low liquidity - high slippage risk');

    return warnings;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(factors: RiskFactors): string[] {
    const recommendations: string[] = [];

    if (factors.lpLocked > 30) recommendations.push('✓ Verify LP lock status before investing');
    if (factors.contractVerified > 0) recommendations.push('✓ Review contract code on block explorer');
    if (factors.holderDistribution > 30) recommendations.push('✓ Check top holder addresses');
    if (factors.liquidityDepth > 30) recommendations.push('✓ Start with small test transactions');
    if (factors.socialSignals > 20) recommendations.push('✓ Research project social presence');

    return recommendations;
  }

  /**
   * Generate summary
   */
  private static generateSummary(
    score: number,
    level: RiskReport['riskLevel'],
    factors: RiskFactors
  ): string {
    const summaries = {
      SAFE: `This token appears safe with a risk score of ${score}/100. Standard precautions apply.`,
      LOW: `This token has low risk (${score}/100) with minor concerns. Proceed with normal caution.`,
      MEDIUM: `This token has medium risk (${score}/100). Exercise increased caution and do your own research.`,
      HIGH: `This token has high risk (${score}/100). Significant concerns detected. Not recommended for most users.`,
      EXTREME: `This token has extreme risk (${score}/100). Multiple red flags detected. Strongly not recommended.`,
    };

    return summaries[level];
  }
}

export default RiskScorer;
