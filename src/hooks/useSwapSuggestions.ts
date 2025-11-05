import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface SwapSuggestion {
    fromToken: string;
    toToken: string;
    reason: string;
    expectedOutput: string;
    slippage: number;
    gasEstimate: string;
    confidence: 'high' | 'medium' | 'low';
    poolDepth: {
        adequate: boolean;
        reserveRatio: number;
    };
}

interface UseSwapSuggestionsProps {
    signer: ethers.JsonRpcSigner | null;
    dexAddress: string;
    tokens: Record<string, string>;
    balances: Record<string, number>;
}

export function useSwapSuggestions({
    signer,
    dexAddress,
    tokens,
    balances,
}: UseSwapSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [gasPrice, setGasPrice] = useState<bigint>(0n);

    // Fetch current gas price
    const fetchGasPrice = useCallback(async () => {
        if (!signer) return;
        try {
            const feeData = await signer.provider?.getFeeData();
            if (feeData?.gasPrice) {
                setGasPrice(feeData.gasPrice);
            }
        } catch (error) {
            console.error('Error fetching gas price:', error);
        }
    }, [signer]);

    // Analyze pools and generate suggestions
    const analyzePools = useCallback(async () => {
        if (!signer || !dexAddress) return;

        setIsAnalyzing(true);
        try {
            const dexAbi = [
                'function getReserves(address, address) view returns (uint256, uint256)',
                'function getAmountOut(uint256, address, address) view returns (uint256)',
            ];

            const dex = new ethers.Contract(dexAddress, dexAbi, signer);
            const newSuggestions: SwapSuggestion[] = [];

            // Analyze each token pair
            const tokenSymbols = Object.keys(tokens);
            for (let i = 0; i < tokenSymbols.length; i++) {
                for (let j = i + 1; j < tokenSymbols.length; j++) {
                    const fromSymbol = tokenSymbols[i];
                    const toSymbol = tokenSymbols[j];

                    // Skip if user has no balance
                    if (!balances[fromSymbol] || balances[fromSymbol] === 0) continue;

                    try {
                        const [reserve0, reserve1] = await dex.getReserves(
                            tokens[fromSymbol],
                            tokens[toSymbol]
                        );

                        // Skip if no liquidity
                        if (reserve0 === 0n || reserve1 === 0n) continue;

                        // Calculate pool depth
                        const reserveRatio = Number(reserve0) / Number(reserve1);
                        const isBalanced = reserveRatio > 0.5 && reserveRatio < 2.0;

                        // Test swap with 1 token
                        const testAmount = ethers.parseEther('1');
                        const estimatedOut = await dex.getAmountOut(
                            testAmount,
                            tokens[fromSymbol],
                            tokens[toSymbol]
                        );

                        // Calculate slippage
                        const expectedRatio = Number(reserve1) / Number(reserve0);
                        const actualRatio = Number(estimatedOut) / Number(testAmount);
                        const slippage = Math.abs((actualRatio - expectedRatio) / expectedRatio) * 100;

                        // Determine if this is a good swap opportunity
                        const isGoodOpportunity = slippage < 1.0 && isBalanced;

                        if (isGoodOpportunity) {
                            // Estimate gas
                            const gasEstimate = gasPrice > 0n
                                ? ethers.formatUnits(gasPrice * 250000n, 'gwei')
                                : 'Unknown';

                            newSuggestions.push({
                                fromToken: fromSymbol,
                                toToken: toSymbol,
                                reason: generateReason(slippage, reserveRatio, isBalanced),
                                expectedOutput: ethers.formatEther(estimatedOut),
                                slippage: slippage,
                                gasEstimate: `${gasEstimate} Gwei`,
                                confidence: slippage < 0.5 ? 'high' : slippage < 1.0 ? 'medium' : 'low',
                                poolDepth: {
                                    adequate: isBalanced,
                                    reserveRatio: reserveRatio,
                                },
                            });
                        }
                    } catch (error) {
                        // Skip pairs that fail
                        continue;
                    }
                }
            }

            // Sort by confidence and slippage
            newSuggestions.sort((a, b) => {
                const confidenceScore = { high: 3, medium: 2, low: 1 };
                return confidenceScore[b.confidence] - confidenceScore[a.confidence] || a.slippage - b.slippage;
            });

            setSuggestions(newSuggestions.slice(0, 5)); // Top 5 suggestions
        } catch (error) {
            console.error('Error analyzing pools:', error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [signer, dexAddress, tokens, balances, gasPrice]);

    // Auto-refresh
    useEffect(() => {
        fetchGasPrice();
        const interval = setInterval(fetchGasPrice, 30000); // Every 30s
        return () => clearInterval(interval);
    }, [fetchGasPrice]);

    useEffect(() => {
        if (signer && Object.keys(balances).length > 0) {
            analyzePools();
            const interval = setInterval(analyzePools, 60000); // Every 60s
            return () => clearInterval(interval);
        }
    }, [signer, balances, analyzePools]);

    return {
        suggestions,
        isAnalyzing,
        gasPrice: gasPrice > 0n ? ethers.formatUnits(gasPrice, 'gwei') : '0',
        refresh: analyzePools,
    };
}

function generateReason(slippage: number, reserveRatio: number, isBalanced: boolean): string {
    const reasons: string[] = [];

    if (slippage < 0.3) {
        reasons.push('Minimal slippage (<0.3%)');
    } else if (slippage < 0.5) {
        reasons.push('Low slippage (<0.5%)');
    } else {
        reasons.push('Acceptable slippage (<1%)');
    }

    if (isBalanced) {
        reasons.push('Well-balanced pool');
    }

    if (reserveRatio > 1.5) {
        reasons.push('High liquidity depth');
    }

    return reasons.join(' • ');
}
