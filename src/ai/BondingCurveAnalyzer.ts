/**
 * AI Bonding Curve Analyzer
 * Analyzes bonding curve tokens and provides insights
 */

export interface CurveAnalysis {
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  tvl: number;
  volume24h: number;
  buyPressure: number;
  sellPressure: number;
  priceProjection: {
    conservative: number;
    moderate: number;
    optimistic: number;
  };
  healthScore: number; // 0-100
  insights: string[];
  warnings: string[];
  recommendations: string[];
}

export class BondingCurveAnalyzer {
  static async analyzeToken(tokenAddress: string, historicalData: any): Promise<CurveAnalysis> {
    const currentPrice = historicalData.currentPrice || 0;
    const priceHistory = historicalData.priceHistory || [];
    const trades = historicalData.trades || [];
    
    // Calculate price changes
    const priceChange24h = this.calculatePriceChange(priceHistory, 24);
    const priceChange7d = this.calculatePriceChange(priceHistory, 168);
    
    // Calculate market metrics
    const marketCap = historicalData.marketCap || 0;
    const tvl = historicalData.tvl || 0;
    const volume24h = this.calculateVolume(trades, 24);
    
    // Analyze buy/sell pressure
    const { buyPressure, sellPressure } = this.analyzePressure(trades);
    
    // Project future prices
    const priceProjection = this.projectPrice(currentPrice, priceHistory, trades);
    
    // Calculate health score
    const healthScore = this.calculateHealthScore({
      priceChange24h,
      tvl,
      volume24h,
      buyPressure,
      sellPressure,
    });
    
    // Generate insights
    const insights = this.generateInsights({
      currentPrice,
      priceChange24h,
      priceChange7d,
      marketCap,
      tvl,
      volume24h,
      buyPressure,
      sellPressure,
      healthScore,
    });
    
    const warnings = this.generateWarnings({
      priceChange24h,
      tvl,
      volume24h,
      sellPressure,
      healthScore,
    });
    
    const recommendations = this.generateRecommendations({
      healthScore,
      buyPressure,
      sellPressure,
      priceChange24h,
    });
    
    return {
      currentPrice,
      priceChange24h,
      priceChange7d,
      marketCap,
      tvl,
      volume24h,
      buyPressure,
      sellPressure,
      priceProjection,
      healthScore,
      insights,
      warnings,
      recommendations,
    };
  }
  
  private static calculatePriceChange(priceHistory: any[], hours: number): number {
    if (priceHistory.length < 2) return 0;
    
    const now = Date.now();
    const targetTime = now - (hours * 60 * 60 * 1000);
    
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const oldPrice = priceHistory.find(p => p.timestamp >= targetTime)?.price || priceHistory[0].price;
    
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  }
  
  private static calculateVolume(trades: any[], hours: number): number {
    const now = Date.now();
    const targetTime = now - (hours * 60 * 60 * 1000);
    
    return trades
      .filter(t => t.timestamp >= targetTime)
      .reduce((sum, t) => sum + t.amount, 0);
  }
  
  private static analyzePressure(trades: any[]): { buyPressure: number; sellPressure: number } {
    const recentTrades = trades.slice(-100); // Last 100 trades
    
    const buys = recentTrades.filter(t => t.type === 'buy');
    const sells = recentTrades.filter(t => t.type === 'sell');
    
    const buyVolume = buys.reduce((sum, t) => sum + t.amount, 0);
    const sellVolume = sells.reduce((sum, t) => sum + t.amount, 0);
    const totalVolume = buyVolume + sellVolume;
    
    return {
      buyPressure: totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50,
      sellPressure: totalVolume > 0 ? (sellVolume / totalVolume) * 100 : 50,
    };
  }
  
  private static projectPrice(
    currentPrice: number,
    priceHistory: any[],
    trades: any[]
  ): { conservative: number; moderate: number; optimistic: number } {
    const trend = this.calculateTrend(priceHistory);
    const momentum = this.calculateMomentum(trades);
    
    const conservative = currentPrice * (1 + (trend * 0.5 + momentum * 0.3));
    const moderate = currentPrice * (1 + (trend * 1.0 + momentum * 0.5));
    const optimistic = currentPrice * (1 + (trend * 1.5 + momentum * 0.8));
    
    return {
      conservative: Math.max(conservative, currentPrice * 0.8),
      moderate: Math.max(moderate, currentPrice * 0.9),
      optimistic: Math.max(optimistic, currentPrice),
    };
  }
  
  private static calculateTrend(priceHistory: any[]): number {
    if (priceHistory.length < 10) return 0;
    
    const recent = priceHistory.slice(-10);
    const older = priceHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }
  
  private static calculateMomentum(trades: any[]): number {
    const recentTrades = trades.slice(-50);
    if (recentTrades.length < 10) return 0;
    
    const buys = recentTrades.filter(t => t.type === 'buy').length;
    const sells = recentTrades.filter(t => t.type === 'sell').length;
    
    return (buys - sells) / recentTrades.length;
  }
  
  private static calculateHealthScore(metrics: any): number {
    let score = 50; // Base score
    
    // Price stability (±20 points)
    if (Math.abs(metrics.priceChange24h) < 5) score += 20;
    else if (Math.abs(metrics.priceChange24h) < 15) score += 10;
    else if (Math.abs(metrics.priceChange24h) > 50) score -= 20;
    
    // TVL (±15 points)
    if (metrics.tvl > 100) score += 15;
    else if (metrics.tvl > 50) score += 10;
    else if (metrics.tvl < 10) score -= 15;
    
    // Volume (±15 points)
    if (metrics.volume24h > 50) score += 15;
    else if (metrics.volume24h > 20) score += 10;
    else if (metrics.volume24h < 5) score -= 15;
    
    // Buy/Sell balance (±20 points)
    const balance = Math.abs(metrics.buyPressure - 50);
    if (balance < 10) score += 20;
    else if (balance < 20) score += 10;
    else if (balance > 40) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private static generateInsights(metrics: any): string[] {
    const insights: string[] = [];
    
    if (metrics.priceChange24h > 20) {
      insights.push(`🚀 Strong upward momentum with ${metrics.priceChange24h.toFixed(1)}% gain in 24h`);
    } else if (metrics.priceChange24h < -20) {
      insights.push(`📉 Significant price decline of ${Math.abs(metrics.priceChange24h).toFixed(1)}% in 24h`);
    }
    
    if (metrics.buyPressure > 65) {
      insights.push(`💪 Strong buy pressure at ${metrics.buyPressure.toFixed(0)}%`);
    } else if (metrics.sellPressure > 65) {
      insights.push(`⚠️ High sell pressure at ${metrics.sellPressure.toFixed(0)}%`);
    }
    
    if (metrics.tvl > 100) {
      insights.push(`💎 Healthy TVL of ${metrics.tvl.toFixed(2)} MATIC indicates strong liquidity`);
    }
    
    if (metrics.volume24h > metrics.tvl * 0.5) {
      insights.push(`📊 High trading activity with volume at ${(metrics.volume24h / metrics.tvl * 100).toFixed(0)}% of TVL`);
    }
    
    if (metrics.healthScore >= 80) {
      insights.push(`✅ Excellent health score of ${metrics.healthScore}/100`);
    } else if (metrics.healthScore >= 60) {
      insights.push(`👍 Good health score of ${metrics.healthScore}/100`);
    }
    
    return insights;
  }
  
  private static generateWarnings(metrics: any): string[] {
    const warnings: string[] = [];
    
    if (metrics.priceChange24h < -30) {
      warnings.push('⚠️ Severe price decline - exercise extreme caution');
    }
    
    if (metrics.tvl < 10) {
      warnings.push('⚠️ Low liquidity - high slippage risk');
    }
    
    if (metrics.volume24h < 1) {
      warnings.push('⚠️ Very low trading volume - limited market activity');
    }
    
    if (metrics.sellPressure > 75) {
      warnings.push('⚠️ Overwhelming sell pressure - potential dump');
    }
    
    if (metrics.healthScore < 40) {
      warnings.push('⚠️ Poor health score - high risk token');
    }
    
    return warnings;
  }
  
  private static generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.healthScore >= 70 && metrics.buyPressure > 55) {
      recommendations.push('✓ Consider buying - positive indicators');
    } else if (metrics.healthScore < 50 || metrics.sellPressure > 65) {
      recommendations.push('✓ Consider waiting - negative indicators');
    }
    
    if (metrics.priceChange24h > 50) {
      recommendations.push('✓ Take profits - significant gains achieved');
    }
    
    if (metrics.buyPressure > 60 && metrics.priceChange24h > 0) {
      recommendations.push('✓ Momentum building - potential entry point');
    }
    
    recommendations.push('✓ Always DYOR and invest responsibly');
    recommendations.push('✓ Use stop-loss orders to manage risk');
    
    return recommendations;
  }
}

export default BondingCurveAnalyzer;
