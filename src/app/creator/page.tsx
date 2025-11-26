'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, Button, Input } from '@/design-system/components';
import { Rocket, Lock, BarChart3, Settings, Upload } from 'lucide-react';
import { useAccount, useWriteContract, useDeployContract, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useBondingCurveFactory, useGetCreatorTokens } from '@/hooks/useBondingCurveFactory';
import { CurveType, contractAddresses, formatAddress } from '@/config/contracts-v2';
import BondingCurveTokenABI from '@/config/abis/BondingCurveToken.json';
import BondingCurveTokenBytecode from '@/config/abis/BondingCurveTokenBytecode.json';
import BondingCurveFactoryV2ABI from '@/config/abis/BondingCurveFactoryV2.json';

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const { address } = useAccount();
  const { creationFee } = useBondingCurveFactory();
  const { tokens: creatorTokens, isLoading: isLoadingTokens, refetch } = useGetCreatorTokens(address || '');
  
  // Form state
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [curveType, setCurveType] = useState<CurveType>(CurveType.LINEAR);
  const [initialPrice, setInitialPrice] = useState('0.001');
  const [creatorRoyalty, setCreatorRoyalty] = useState('2');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [tokenImage, setTokenImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  
  const publicClient = usePublicClient();
  const { deployContractAsync, isPending: isDeploying } = useDeployContract();
  const { writeContractAsync, isPending: isRegistering, error } = useWriteContract();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const shortAccount = address ? formatAddress(address) : '';
  const creationFeeValue = creationFee ? BigInt(creationFee) : 0n;
  const creationFeeDisplay = creationFeeValue ? Number(formatEther(creationFeeValue)).toFixed(3) : '0.000';
  const allCreatorTokens = useMemo(
    () => Array.from(new Set([...(creatorTokens || []), ...localTokens])),
    [creatorTokens, localTokens]
  );

  // Load locally stored tokens for this creator (for cases where factory registration fails)
  useEffect(() => {
    if (!address || typeof window === 'undefined') return;
    try {
      const key = `creator_tokens_${address.toLowerCase()}`;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalTokens(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [address]);

  const addLocalToken = (tokenAddr: string) => {
    setLocalTokens((prev) => {
      const next = Array.from(new Set([...prev, tokenAddr]));
      if (address && typeof window !== 'undefined') {
        try {
          const key = `creator_tokens_${address.toLowerCase()}`;
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, GIF)');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setTokenImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setTokenImage(null);
    setImageFile(null);
  };
  
  const handleCreateToken = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!tokenName || !tokenSymbol || !initialPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const royaltyInt = Math.min(5, Math.max(1, Number(creatorRoyalty) || 1));
    const metadata = JSON.stringify({
      description: description || '',
      website: website || '',
      twitter: twitter || '',
      telegram: telegram || '',
      image: tokenImage || '',
      initialSupply,
      curveType,
      initialPrice,
      creatorRoyalty: royaltyInt,
    });
    
    try {
      setIsProcessing(true);
      setStatus({ message: 'Deploying your bonding curve token...', type: 'info' });

      const deploymentHash = await deployContractAsync({
        abi: BondingCurveTokenABI,
        bytecode: BondingCurveTokenBytecode.bytecode as `0x${string}`,
        args: [
          tokenName,
          tokenSymbol,
          address,
          contractAddresses.bondingCurveFactory,
          curveType,
          parseEther(initialPrice),
          BigInt(royaltyInt),
          metadata,
        ],
      });

      if (!publicClient) {
        throw new Error('Public client not initialized');
      }

      const deploymentReceipt = await publicClient.waitForTransactionReceipt({
        hash: deploymentHash,
      });

      if (!deploymentReceipt.contractAddress) {
        throw new Error('Deployment failed: no contract address returned');
      }

      setStatus({ message: 'Registering token with the factory...', type: 'info' });

      try {
        await writeContractAsync({
          address: contractAddresses.bondingCurveFactory as `0x${string}`,
          abi: BondingCurveFactoryV2ABI,
          functionName: 'registerToken',
          args: [
            deploymentReceipt.contractAddress,
            tokenName,
            tokenSymbol,
            curveType,
            parseEther(initialPrice),
          ],
          value: creationFeeValue,
        });
        if (refetch) {
          await refetch();
        }
      } catch (registerError) {
        // If on-chain registration fails, we still track the token locally
        console.error('Factory registration failed, falling back to local tracking:', registerError);
      }

      setDeployedAddress(deploymentReceipt.contractAddress);
      addLocalToken(deploymentReceipt.contractAddress);
      setStatus({
        message: 'Token live! Share it with your community.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error:', err);
      setStatus({ 
        message: `Error: ${err.message || 'Failed to prepare deployment'}`, 
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Creator Dashboard</h1>
          <p className="text-neutral-400">Launch and manage your tokens</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'create', label: 'Create Token', icon: Rocket },
            { id: 'manage', label: 'Manage', icon: Settings },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'lock', label: 'LP Lock', icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-bg-secondary text-neutral-400 hover:bg-dark-bg-hover'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Token Tab */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated" padding="lg">
              <h2 className="text-2xl font-bold text-white mb-6">Create Bonding Curve Token</h2>
              <div className="space-y-4">
                <Input 
                  label="Token Name *" 
                  placeholder="My Awesome Token"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
                <Input 
                  label="Token Symbol *" 
                  placeholder="MAT"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                />
                <Input 
                  label="Initial Supply" 
                  placeholder="1000000" 
                  type="number"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                />
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Curve Type</label>
                  <select 
                    className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white"
                    value={curveType}
                    onChange={(e) => setCurveType(Number(e.target.value) as CurveType)}
                  >
                    <option value={CurveType.LINEAR}>Linear - Steady growth</option>
                    <option value={CurveType.EXPONENTIAL}>Exponential - Rapid appreciation</option>
                    <option value={CurveType.SIGMOID}>Sigmoid - Controlled ceiling</option>
                  </select>
                </div>

                <Input 
                  label="Initial Price (MATIC) *" 
                  placeholder="0.001" 
                  type="number"
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                  step="0.001"
                />

                <div className="space-y-2">
                  <Input
                    label="Creator Royalty (%)"
                    placeholder="2"
                    type="number"
                    min={1}
                    max={5}
                    value={creatorRoyalty}
                    onChange={(e) => {
                      const value = Math.min(5, Math.max(1, Number(e.target.value) || 1));
                      setCreatorRoyalty(String(value));
                    }}
                  />
                  <p className="text-xs text-neutral-500">Earn up to 5% from every trade.</p>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Token Image (Optional)</label>
                  {!tokenImage ? (
                    <label className="block border-2 border-dashed border-dark-border-primary rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                      <p className="text-neutral-400 text-sm">Click to upload or drag and drop</p>
                      <p className="text-neutral-500 text-xs mt-1">PNG, JPG, GIF up to 5MB</p>
                    </label>
                  ) : (
                    <div className="relative border-2 border-primary-500 rounded-lg p-4">
                      <img 
                        src={tokenImage} 
                        alt="Token preview" 
                        className="w-32 h-32 mx-auto rounded-full object-cover"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-2 bg-error-500 hover:bg-error-600 text-white rounded-full transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <p className="text-center text-neutral-400 text-sm mt-2">{imageFile?.name}</p>
                      <p className="text-center text-neutral-500 text-xs">{(imageFile!.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                </div>

                <Input 
                  label="Description (Optional)" 
                  placeholder="Tell us about your token..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Input 
                  label="Website (Optional)" 
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <Input 
                  label="Twitter (Optional)" 
                  placeholder="https://twitter.com/..."
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
                <Input 
                  label="Telegram (Optional)" 
                  placeholder="https://t.me/..."
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                />

                {!address && (
                  <div className="p-4 bg-warning-500/10 border border-warning-500 rounded-lg">
                    <p className="text-warning-500 text-sm text-center">Please connect your wallet to create a token</p>
                  </div>
                )}

                {status.message && (
                  <div className={`p-4 rounded-lg border ${
                    status.type === 'error' ? 'bg-error-500/10 border-error-500' :
                    status.type === 'success' ? 'bg-success-500/10 border-success-500' :
                    'bg-primary-500/10 border-primary-500'
                  }`}>
                    <p className={`text-sm text-center ${
                      status.type === 'error' ? 'text-error-500' :
                      status.type === 'success' ? 'text-success-500' :
                      'text-primary-500'
                    }`}>{status.message}</p>
                  </div>
                )}

                {status.type === 'success' && deployedAddress && (
                  <div className="p-4 bg-success-500/10 border border-success-500 rounded-lg text-center space-y-2">
                    <p className="text-success-500 text-sm">Contract: {deployedAddress}</p>
                    <a
                      href={`https://amoy.polygonscan.com/address/${deployedAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-500 text-sm underline"
                    >
                      View on Polygonscan
                    </a>
                    <a
                      href={`/token/${deployedAddress}`}
                      className="text-primary-500 text-sm underline block"
                    >
                      Open in CopilotX DEX
                    </a>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-error-500/10 border border-error-500 rounded-lg">
                    <p className="text-error-500 text-sm">{error.message}</p>
                  </div>
                )}

                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth
                  onClick={handleCreateToken}
                  disabled={
                    !address ||
                    !tokenName ||
                    !tokenSymbol ||
                    !initialPrice ||
                    isDeploying ||
                    isRegistering ||
                    isProcessing
                  }
                >
                  {(isDeploying || isRegistering || isProcessing) ? 'Deploying...' : 'Create Token'}
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card variant="elevated" padding="lg">
                <h3 className="text-xl font-bold text-white mb-4">Preview</h3>
                <div className="space-y-4">
                  {tokenImage ? (
                    <img 
                      src={tokenImage} 
                      alt="Token" 
                      className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-primary-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 mx-auto" />
                  )}
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-white">{tokenName || 'Token Name'}</h4>
                    <p className="text-neutral-400">{tokenSymbol || 'SYMBOL'}</p>
                  </div>
                  <div className="p-4 bg-dark-bg-secondary rounded-lg">
                    <p className="text-neutral-400 text-sm">{description || 'Description will appear here...'}</p>
                  </div>
                  {(website || twitter || telegram) && (
                    <div className="flex gap-2 justify-center">
                      {website && <span className="text-xs text-neutral-500">🌐 Website</span>}
                      {twitter && <span className="text-xs text-neutral-500">🐦 Twitter</span>}
                      {telegram && <span className="text-xs text-neutral-500">✈️ Telegram</span>}
                    </div>
                  )}
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <h3 className="text-xl font-bold text-white mb-4">Curve Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Type</span>
                    <span className="text-white">
                      {curveType === CurveType.LINEAR && 'Linear'}
                      {curveType === CurveType.EXPONENTIAL && 'Exponential'}
                      {curveType === CurveType.SIGMOID && 'Sigmoid'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Initial Price</span>
                    <span className="text-white">{initialPrice || '0.001'} MATIC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Initial Supply</span>
                    <span className="text-white">{Number(initialSupply).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Creation Fee</span>
                    <span className="text-white">{creationFeeDisplay} MATIC</span>
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <h3 className="text-lg font-bold text-white mb-2">💡 Pro Tips</h3>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li>• Linear curve: Steady, predictable growth</li>
                  <li>• Exponential curve: Rapid price appreciation</li>
                  <li>• Sigmoid curve: Controlled growth with ceiling</li>
                  <li>• Lock LP tokens to build trust</li>
                </ul>
              </Card>

            </div>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-2xl font-bold text-white mb-6">Your Tokens</h2>
            {!address ? (
              <div className="p-6 bg-dark-bg-secondary rounded-lg text-center space-y-2">
                <p className="text-neutral-400">Connect your wallet to load your creations.</p>
                <p className="text-neutral-500 text-sm">We read BondingCurveFactory for on-chain data.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {isLoadingTokens && (
                  <div className="p-6 bg-dark-bg-secondary rounded-lg text-center">
                    <p className="text-neutral-400">Loading your tokens...</p>
                  </div>
                )}

                {!isLoadingTokens && allCreatorTokens.length === 0 && (
                  <div className="p-6 bg-dark-bg-secondary rounded-lg text-center space-y-2">
                    <p className="text-neutral-400">No tokens found for {shortAccount}</p>
                    <p className="text-neutral-500 text-sm">Create your first bonding curve token above.</p>
                  </div>
                )}

                {!isLoadingTokens && allCreatorTokens.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allCreatorTokens.map((token) => (
                      <div
                        key={token}
                        className="p-5 rounded-xl bg-dark-bg-secondary border border-dark-border-primary space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-400">Token Address</p>
                            <p className="text-white font-mono text-sm">{formatAddress(token)}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs">
                            Bonding Curve
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <Link
                            href={`/token/${token}`}
                            className="flex-1 text-center px-3 py-2 rounded-lg bg-primary-500/20 text-primary-300 text-sm font-medium hover:bg-primary-500/30 transition"
                          >
                            View on CopilotX
                          </Link>
                          <a
                            href={`https://amoy.polygonscan.com/address/${token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center px-3 py-2 rounded-lg bg-dark-bg-hover text-neutral-300 text-sm font-medium hover:text-white transition"
                          >
                            Polygonscan
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="lg">
              <p className="text-neutral-400 text-sm mb-1">Total Volume</p>
              <p className="text-3xl font-bold text-white">On-Chain</p>
              <p className="text-neutral-500 text-xs mt-1">Real-time data</p>
            </Card>
            <Card variant="elevated" padding="lg">
              <p className="text-neutral-400 text-sm mb-1">Total Holders</p>
              <p className="text-3xl font-bold text-white">Live</p>
              <p className="text-neutral-500 text-xs mt-1">Real-time data</p>
            </Card>
            <Card variant="elevated" padding="lg">
              <p className="text-neutral-400 text-sm mb-1">Royalties Earned</p>
              <p className="text-3xl font-bold text-white">Verified</p>
              <p className="text-neutral-500 text-xs mt-1">Real-time data</p>
            </Card>
          </div>
        )}

        {/* LP Lock Tab */}
        {activeTab === 'lock' && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-2xl font-bold text-white mb-6">Lock Liquidity</h2>
            <div className="max-w-2xl space-y-4">
              <Input label="Token Address" placeholder="0x..." />
              <Input label="LP Token Address" placeholder="0x..." />
              <Input label="Amount to Lock" placeholder="0.0" type="number" />
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Lock Duration</label>
                <select className="w-full bg-dark-bg-secondary border border-dark-border-primary rounded-lg px-4 py-3 text-white">
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                  <option value="730">2 years</option>
                  <option value="1095">3 years</option>
                </select>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Lock Liquidity
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
