import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AUTH_BASE_URL } from '../api/config';
import { getToken, getStoredUser } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import R4XScene from './R4XScene';
import './DTNCStore.css';

// Realistic, accessible Web3 utility token pricing
const TIERS = [
  { amount: 50, price: '0.025 SOL', priceNum: 0.025, popular: false, subtitle: 'Starter Allocation' },
  { amount: 100, price: '0.05 SOL', priceNum: 0.05, popular: true, subtitle: 'Node Validator' },
  { amount: 250, price: '0.12 SOL', priceNum: 0.12, popular: false, subtitle: 'Threat Analyst' },
  { amount: 500, price: '0.22 SOL', priceNum: 0.22, popular: false, subtitle: 'Enterprise Node' },
];

const TOKEN_MINT_ADDRESS = 'mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3';
const TREASURY_WALLET_ADDRESS = '7BuUZExqbTbu17bewobuxxo4kpA4MNrtWrRT5oraThtc';
const DEVNET_RPC = 'https://api.devnet.solana.com';

const SUPPORTED_WALLETS = [
  {
    name: 'Phantom',
    recommended: true,
    tagline: 'Most popular Solana wallet (Used by DATIN development team)',
    url: 'https://phantom.app/download',
    badge: 'Recommended',
    icon: '👻',
    steps: [
      'Download & install Phantom from phantom.app',
      'Open Settings (⚙️ icon in bottom right) → Developer Settings',
      'Toggle ON "Testnet Mode" and select "Solana Devnet"',
      'Connect Phantom to pay with Devnet SOL and receive DTNC directly',
    ],
  },
  {
    name: 'Solflare',
    recommended: false,
    tagline: 'Feature-rich Solana wallet with native token management',
    url: 'https://solflare.com',
    badge: 'Supported',
    icon: '☀️',
    steps: [
      'Install Solflare browser extension or mobile app',
      'Go to Settings → Network → Switch to "Solana Devnet"',
      'Copy your Devnet address to receive tokens',
    ],
  },
  {
    name: 'Backpack',
    recommended: false,
    tagline: 'Modern Web3 wallet built for Solana SPL & Token-2022',
    url: 'https://backpack.app',
    badge: 'Supported',
    icon: '🎒',
    steps: [
      'Install Backpack wallet extension',
      'Go to Preferences → Developer Mode → Select "Solana Devnet"',
      'Copy your address and enter it in the checkout field',
    ],
  },
  {
    name: 'Brave Wallet',
    recommended: false,
    tagline: 'Built directly into Brave Browser with instant Devnet switching',
    url: 'https://brave.com/wallet/',
    badge: 'Supported',
    icon: '🦁',
    steps: [
      'Open Brave Browser and click the Wallet icon in the toolbar',
      'Click the Network selector at the top → Choose "Solana Devnet"',
      'Copy your Solana address to complete checkout',
    ],
  },
];

const DTNCStore = ({ user: propUser }) => {
  const [selectedTier, setSelectedTier] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [copiedMint, setCopiedMint] = useState(false);

  // Web3 Phantom state
  const [phantomAccount, setPhantomAccount] = useState(null);
  const [phantomConnected, setPhantomConnected] = useState(false);
  const [solBalance, setSolBalance] = useState(null);

  // Switch Account Modal State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchSuccessAccount, setSwitchSuccessAccount] = useState(null);
  const [manualDisconnected, setManualDisconnected] = useState(false);

  const hover = useHoverSound();
  const click = useClickSound();
  const user = propUser || getStoredUser();

  // Helper to fetch balance for an account
  const refreshSolBalance = async (pubkey) => {
    try {
      const conn = new Connection(DEVNET_RPC, 'confirmed');
      const bal = await conn.getBalance(new PublicKey(pubkey));
      setSolBalance(bal / LAMPORTS_PER_SOL);
    } catch (_) {}
  };

  // Handler when Phantom reports an account update
  const handleAccountUpdate = (publicKey) => {
    if (publicKey) {
      const pubkeyStr = typeof publicKey === 'string' ? publicKey : publicKey.toString();
      setPhantomAccount((prev) => {
        if (prev && prev !== pubkeyStr) {
          setSwitchSuccessAccount(pubkeyStr);
          setTimeout(() => {
            setSwitchSuccessAccount(null);
            setShowSwitchModal(false);
          }, 2200);
        }
        return pubkeyStr;
      });
      setPhantomConnected(true);
      setWalletAddress(pubkeyStr);
      setError('');
      refreshSolBalance(pubkeyStr);
    } else {
      setPhantomAccount(null);
      setPhantomConnected(false);
      setSolBalance(null);
      setWalletAddress('');
    }
  };

  // Eagerly check if Phantom is already connected/trusted on initial mount
  useEffect(() => {
    if (window.solana && window.solana.isPhantom && !manualDisconnected) {
      window.solana
        .connect({ onlyIfTrusted: true })
        .then((resp) => {
          handleAccountUpdate(resp.publicKey);
        })
        .catch(() => {});
    }
  }, [manualDisconnected]);

  // Listen to Phantom account switch events (accountChanged & accountsChanged) & tab focus
  useEffect(() => {
    if (!window.solana || !window.solana.isPhantom) return;

    const onAccountChanged = (pubkey) => {
      handleAccountUpdate(pubkey);
    };

    const onAccountsChanged = (accounts) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        handleAccountUpdate(accounts[0]);
      } else if (!accounts || accounts.length === 0) {
        handleAccountUpdate(null);
      }
    };

    const onDisconnect = () => {
      handleAccountUpdate(null);
    };

    window.solana.on('accountChanged', onAccountChanged);
    if (window.solana.on) {
      window.solana.on('accountsChanged', onAccountsChanged);
      window.solana.on('disconnect', onDisconnect);
    }

    // Instantly detect account change when user clicks back into tab after changing account in Phantom extension
    const handleTabFocus = () => {
      if (window.solana && window.solana.isPhantom && window.solana.publicKey && !manualDisconnected) {
        const currentPubkey = window.solana.publicKey.toString();
        if (currentPubkey !== phantomAccount) {
          handleAccountUpdate(currentPubkey);
        }
      }
    };
    window.addEventListener('focus', handleTabFocus);

    return () => {
      if (window.solana.removeListener) {
        window.solana.removeListener('accountChanged', onAccountChanged);
        window.solana.removeListener('accountsChanged', onAccountsChanged);
        window.solana.removeListener('disconnect', onDisconnect);
      }
      window.removeEventListener('focus', handleTabFocus);
    };
  }, [phantomAccount, manualDisconnected]);

  // Connect Phantom
  const handleConnectPhantom = async () => {
    click.onClick();
    if (!window.solana || !window.solana.isPhantom) {
      setShowWalletGuide(true);
      setError('Phantom wallet is not installed in your browser. Please install Phantom to connect.');
      return;
    }

    try {
      setManualDisconnected(false);
      const resp = await window.solana.connect({ onlyIfTrusted: false });
      handleAccountUpdate(resp.publicKey);
    } catch (err) {
      console.error('Phantom connect error:', err);
      setError(err.message || 'Failed to connect Phantom wallet');
    }
  };

  // Disconnect Phantom
  const handleDisconnectPhantom = async () => {
    click.onClick();
    setManualDisconnected(true);
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
    } catch (_) {}
    setPhantomAccount(null);
    setPhantomConnected(false);
    setSolBalance(null);
    setWalletAddress('');
    setError('');
  };

  // Open Switch Account Modal
  const handleOpenSwitchModal = () => {
    click.onClick();
    setShowSwitchModal(true);
  };

  const handleSelectTier = (tier) => {
    click.onClick();
    if (selectedTier?.amount === tier.amount) {
      setSelectedTier(null);
    } else {
      setSelectedTier(tier);
      setError('');
    }
  };

  const handleCopyMint = () => {
    click.onClick();
    navigator.clipboard.writeText(TOKEN_MINT_ADDRESS);
    setCopiedMint(true);
    setTimeout(() => setCopiedMint(false), 2500);
  };

  const isTreasuryAddress = walletAddress.trim() === TREASURY_WALLET_ADDRESS;

  const handlePurchase = async () => {
    if (!selectedTier) {
      setError('Please select a token package first');
      return;
    }

    const trimmedWallet = walletAddress.trim();
    if (!trimmedWallet) {
      setError('Please connect your Phantom wallet to purchase');
      return;
    }

    if (trimmedWallet.length < 32 || trimmedWallet.length > 44) {
      setError('Invalid Solana wallet address');
      return;
    }

    // Strict validation: Require Phantom connection to prevent cross-account unpaid exploits
    if (!phantomConnected || !phantomAccount) {
      setError('Please connect your Phantom wallet using the button above to pay with SOL.');
      return;
    }

    if (trimmedWallet !== phantomAccount) {
      setError('Receiving wallet must match the connected Phantom wallet. To use another wallet, switch accounts in Phantom.');
      return;
    }

    click.onClick();
    setLoading(true);
    setError('');
    let solPaymentSignature = null;

    try {
      // 1. Mandatory on-chain SOL deduction via Phantom
      setLoadingStep(`Please approve the ${selectedTier.price} payment in Phantom...`);

      const conn = new Connection(DEVNET_RPC, 'confirmed');
      const buyerPubkey = new PublicKey(phantomAccount);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);

      const lamports = Math.round(selectedTier.priceNum * LAMPORTS_PER_SOL);

      // Check balance before asking
      const currentLamports = await conn.getBalance(buyerPubkey);
      if (currentLamports < lamports) {
        const currentSol = (currentLamports / LAMPORTS_PER_SOL).toFixed(3);
        throw new Error(
          `Insufficient Devnet SOL in your wallet (${currentSol} SOL). You need ${selectedTier.price}. Please get free Devnet SOL at faucet.solana.com.`
        );
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: treasuryPubkey,
          lamports,
        })
      );

      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = buyerPubkey;

      // Pops up Phantom dialog for user signature
      const { signature } = await window.solana.signAndSendTransaction(tx);
      solPaymentSignature = signature;

      setLoadingStep('Confirming SOL payment on Solana Devnet...');
      await conn.confirmTransaction(signature, 'confirmed');

      // Refresh SOL balance immediately
      await refreshSolBalance(buyerPubkey.toBase58());

      // 2. Dispatch DTNC Tokens from Treasury with verified on-chain payment signature
      setLoadingStep(`Delivering ${selectedTier.amount} DTNC tokens to your wallet...`);
      const token = getToken();

      const { data } = await axios.post(
        `${AUTH_BASE_URL}/purchase-dtnc`,
        {
          walletAddress: trimmedWallet,
          amount: selectedTier.amount,
          price: selectedTier.priceNum,
          solPaymentSignature,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      if (data.success) {
        setReceipt({
          ...data,
          solPaymentSignature,
        });
        setSelectedTier(null);
      } else {
        setError(data.message || data.error || 'Purchase failed');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Purchase failed. Please try again.';
      setError(serverMsg);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="store-page-root">
      {/* 1. Fullscreen interactive R4X Spline 3D Scene */}
      <R4XScene watermark="DTNC" />

      {/* 2. Floating Bottom Dock Container (Middle Bar + Checkout + Tiers) */}
      <div className="store-dock-wrapper">
        <motion.div
          className="store-dock-container"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Middle Store Bar: Positioned below 3D ball and above tier options */}
          <div className="store-middle-bar">
            <div className="store-middle-bar-left">
              <span className="store-middle-bar-coin">🪙</span>
              <div className="store-middle-bar-info">
                <h2 className="store-middle-bar-title">DATIN Coin (DTNC) Store</h2>
                <span className="store-middle-bar-desc">
                  Solana Devnet Token-2022 • Mint: {TOKEN_MINT_ADDRESS.slice(0, 6)}...{TOKEN_MINT_ADDRESS.slice(-4)}
                </span>
              </div>
            </div>

            <div className="store-middle-bar-actions">
              {phantomConnected ? (
                <div className="store-phantom-connected-group">
                  <div
                    className="store-phantom-badge"
                    title={`Connected: ${phantomAccount}\nDevnet Balance: ${solBalance !== null ? solBalance.toFixed(3) : '...'} SOL`}
                  >
                    <span className="phantom-dot" />
                    <span className="phantom-label">
                      {phantomAccount.slice(0, 4)}...{phantomAccount.slice(-4)}
                    </span>
                    {solBalance !== null && (
                      <span className="phantom-sol-tag">{solBalance.toFixed(2)} SOL</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="store-phantom-switch-btn"
                    onClick={handleOpenSwitchModal}
                    onMouseEnter={hover.onMouseEnter}
                    title="Switch Account in Phantom"
                  >
                    ⇄ Switch
                  </button>

                  <button
                    type="button"
                    className="store-phantom-disconnect-btn"
                    onClick={handleDisconnectPhantom}
                    onMouseEnter={hover.onMouseEnter}
                    title="Disconnect Wallet"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="store-phantom-connect-btn"
                  onClick={handleConnectPhantom}
                  onMouseEnter={hover.onMouseEnter}
                  title="Connect Phantom wallet to pay with Devnet SOL"
                >
                  <span className="phantom-btn-ghost">👻</span>
                  <span>Connect Phantom</span>
                </button>
              )}

              <button
                type="button"
                className="store-wallet-guide-pill-btn"
                onClick={() => {
                  click.onClick();
                  setShowWalletGuide(true);
                }}
                onMouseEnter={hover.onMouseEnter}
                title="View supported wallets and setup instructions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M16 12h.01" />
                  <path d="M2 10h20" />
                </svg>
                <span>Wallets & Setup</span>
              </button>
            </div>
          </div>

          {/* Slide-up Checkout Panel when a tier is selected */}
          <AnimatePresence>
            {selectedTier && !receipt && (
              <motion.div
                className="store-checkout-panel"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="store-checkout-top">
                  <div className="checkout-summary-badge">
                    <span className="checkout-summary-amount">
                      {selectedTier.amount.toLocaleString()} DTNC
                    </span>
                    <span className="checkout-summary-divider">•</span>
                    <span className="checkout-summary-price">{selectedTier.price}</span>
                  </div>

                  <button
                    type="button"
                    className="checkout-cancel-btn"
                    onClick={() => { click.onClick(); setSelectedTier(null); }}
                    onMouseEnter={hover.onMouseEnter}
                    aria-label="Close checkout"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {error && <div className="form-error store-error-alert">{error}</div>}

                {/* Treasury address loopback warning */}
                {isTreasuryAddress && (
                  <div className="store-treasury-warning">
                    <span className="store-treasury-warning-icon">⚠️</span>
                    <div className="store-treasury-warning-text">
                      <strong>Treasury Account Detected:</strong> This wallet is the DATIN Treasury reserve. Purchasing with this account transfers SOL and DTNC from yourself to yourself. To receive new DTNC tokens into a customer wallet, switch to a 2nd account in Phantom.
                    </div>
                  </div>
                )}

                <div className="store-checkout-form-row">
                  <div className="store-input-group">
                    <input
                      className="glass-input store-wallet-input"
                      type="text"
                      placeholder="Connect Phantom wallet above to autofill address"
                      value={walletAddress}
                      readOnly={phantomConnected}
                      onChange={(e) => {
                        if (!phantomConnected) {
                          setWalletAddress(e.target.value);
                          setError('');
                        }
                      }}
                      disabled={loading}
                    />

                    {phantomConnected && (
                      <span className="store-wallet-locked-badge">
                        🔒 Linked to Phantom
                      </span>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    className="btn-primary store-purchase-btn"
                    onClick={handlePurchase}
                    disabled={loading || !walletAddress.trim()}
                    onMouseEnter={hover.onMouseEnter}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? (
                      <div className="chatbar-loading-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <>
                        <span>Pay {selectedTier.price} & Buy {selectedTier.amount} DTNC</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                </div>

                {loadingStep && (
                  <div className="store-checkout-step-status">
                    <div className="store-spinner-small" />
                    <span>{loadingStep}</span>
                  </div>
                )}

                {/* Helpful Wallet Notice & Guide Link inside Checkout */}
                <div className="store-wallet-hint-row">
                  <div className="store-wallet-hint-left">
                    <span className="store-wallet-hint-icon">⚡</span>
                    <span className="store-wallet-hint-text">
                      {phantomConnected ? (
                        <>Payment of <strong>{selectedTier.price}</strong> will be deducted via Phantom popup.</>
                      ) : (
                        <>Please <strong>Connect Phantom</strong> above to authorize payment.</>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="store-wallet-hint-btn"
                    onClick={() => {
                      click.onClick();
                      setShowWalletGuide(true);
                    }}
                    onMouseEnter={hover.onMouseEnter}
                  >
                    Devnet Guide ↗
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dock of 4 Tier Cards */}
          <div className="store-dock-shelf">
            <div className="store-tiers-dock">
              {TIERS.map((tier) => {
                const isSelected = selectedTier?.amount === tier.amount;
                return (
                  <motion.button
                    key={tier.amount}
                    type="button"
                    className={`store-dock-tier-card${isSelected ? ' is-selected' : ''}${tier.popular ? ' is-popular' : ''}`}
                    onClick={() => handleSelectTier(tier)}
                    onMouseEnter={hover.onMouseEnter}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {tier.popular && <span className="dock-popular-pill">Most Popular</span>}
                    <div className="dock-tier-amount-row">
                      <span className="dock-tier-num">{tier.amount.toLocaleString()}</span>
                      <span className="dock-tier-sym">DTNC</span>
                    </div>
                    <div className="dock-tier-price-row">
                      <span className="dock-tier-cost">{tier.price}</span>
                    </div>
                    <div className="dock-tier-sub-row">
                      <span className="dock-tier-sub">{tier.subtitle}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Supported Devnet Wallets & Setup Guide Modal */}
      <AnimatePresence>
        {showWalletGuide && (
          <motion.div
            className="store-guide-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWalletGuide(false)}
          >
            <motion.div
              className="store-guide-modal glass-card"
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="store-guide-header">
                <div className="store-guide-title-box">
                  <span className="store-guide-badge">Solana Devnet Guide</span>
                  <h2 className="store-guide-title">Supported Devnet Wallets & Setup</h2>
                  <p className="store-guide-subtitle">
                    To receive and hold DTNC tokens, you must use a Solana wallet and <strong>enable Devnet Mode</strong> in your wallet application.
                  </p>
                </div>
                <button
                  type="button"
                  className="store-guide-close-btn"
                  onClick={() => {
                    click.onClick();
                    setShowWalletGuide(false);
                  }}
                  onMouseEnter={hover.onMouseEnter}
                  aria-label="Close guide"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Crucial Devnet Activation Banner */}
              <div className="store-guide-notice-card">
                <div className="store-notice-icon">⚠️</div>
                <div className="store-notice-content">
                  <strong>Crucial Requirement: Enable Devnet Mode</strong>
                  <p>
                    DTNC is deployed on <strong>Solana Devnet</strong> using the high-security <strong>Token-2022 (SPL Token Extensions)</strong> standard. Your wallet will not display your DTNC balance unless Devnet / Testnet mode is switched ON.
                  </p>
                </div>
              </div>

              {/* Wallet Cards Grid */}
              <div className="store-wallets-grid">
                {SUPPORTED_WALLETS.map((w) => (
                  <div key={w.name} className={`store-wallet-card${w.recommended ? ' is-recommended' : ''}`}>
                    <div className="store-wallet-card-top">
                      <div className="store-wallet-brand">
                        <span className="store-wallet-icon">{w.icon}</span>
                        <div>
                          <h3 className="store-wallet-name">{w.name}</h3>
                          <span className="store-wallet-tagline">{w.tagline}</span>
                        </div>
                      </div>
                      <span className={`store-wallet-badge${w.recommended ? ' badge-rec' : ''}`}>
                        {w.badge}
                      </span>
                    </div>

                    <div className="store-wallet-steps">
                      <span className="store-wallet-steps-title">How to enable Devnet:</span>
                      <ol>
                        {w.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <a
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="store-wallet-link-btn"
                      onClick={() => click.onClick()}
                    >
                      <span>Get {w.name} Wallet</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>

              {/* Token Details & 1-Click Copy */}
              <div className="store-token-details-card">
                <div className="store-token-details-left">
                  <span className="store-token-label">DTNC Token-2022 Mint Address</span>
                  <span className="store-token-mint">{TOKEN_MINT_ADDRESS}</span>
                </div>
                <div className="store-token-details-actions">
                  <button
                    type="button"
                    className="store-token-copy-btn"
                    onClick={handleCopyMint}
                    onMouseEnter={hover.onMouseEnter}
                  >
                    {copiedMint ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Mint</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://explorer.solana.com/address/${TOKEN_MINT_ADDRESS}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-token-explorer-btn"
                  >
                    <span>View on Solana Explorer</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="store-guide-footer">
                <button
                  type="button"
                  className="btn-primary store-guide-done-btn"
                  onClick={() => {
                    click.onClick();
                    setShowWalletGuide(false);
                  }}
                  onMouseEnter={hover.onMouseEnter}
                >
                  Understood & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Switch Phantom Account Modal */}
      <AnimatePresence>
        {showSwitchModal && (
          <motion.div
            className="store-guide-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSwitchModal(false)}
          >
            <motion.div
              className="store-switch-modal glass-card"
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="store-guide-header">
                <div className="store-guide-title-group">
                  <div className="store-switch-badge-icon">⇄</div>
                  <div>
                    <h2 className="store-guide-title">Switch Phantom Account</h2>
                    <p className="store-guide-subtitle">
                      Change the active Solana wallet receiving & paying for DTNC
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="store-guide-close-btn"
                  onClick={() => {
                    click.onClick();
                    setShowSwitchModal(false);
                  }}
                  onMouseEnter={hover.onMouseEnter}
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Active Account Card */}
              {phantomAccount && (
                <div className="store-switch-account-card">
                  <div className="store-account-top">
                    <span className="store-account-live-dot"></span>
                    <span className="store-account-label">Currently Connected</span>
                  </div>
                  <div className="store-account-addr">{phantomAccount}</div>
                  <div className="store-account-stats">
                    Devnet Balance: <strong>{solBalance !== null ? `${solBalance.toFixed(3)} SOL` : 'Fetching...'}</strong>
                  </div>
                </div>
              )}

              {/* Live Switch Feedback */}
              {switchSuccessAccount ? (
                <div className="store-switch-success-pill">
                  <span className="store-switch-success-check">✓</span>
                  <div>
                    <strong>Switched Successfully!</strong>
                    <p>Connected to {switchSuccessAccount.slice(0, 6)}...{switchSuccessAccount.slice(-4)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="store-switch-note">
                    <span className="store-switch-note-icon">💡</span>
                    <p>
                      Solana extensions manage accounts internally. To switch between your wallets (e.g. Account 1 and Account 2):
                    </p>
                  </div>

                  <div className="store-switch-steps-box">
                    <div className="store-switch-step-row">
                      <div className="store-step-num">1</div>
                      <div className="store-step-text">
                        <strong>Open Phantom Toolbar Extension</strong>
                        <p>Click the purple Phantom ghost icon (👻) in your browser’s extension bar.</p>
                      </div>
                    </div>
                    <div className="store-switch-step-row">
                      <div className="store-step-num">2</div>
                      <div className="store-step-text">
                        <strong>Click Account Name at Top</strong>
                        <p>Click the dropdown at the very top of Phantom (e.g., <em>Account 2</em>).</p>
                      </div>
                    </div>
                    <div className="store-switch-step-row">
                      <div className="store-step-num">3</div>
                      <div className="store-step-text">
                        <strong>Select Desired Account</strong>
                        <p>Choose Account 1 or Account 2. This window detects it instantly!</p>
                      </div>
                    </div>
                  </div>

                  <div className="store-switch-listening-row">
                    <span className="store-switch-radar-ring"></span>
                    <span>Waiting for account selection in Phantom...</span>
                  </div>
                </>
              )}

              <div className="store-guide-footer">
                <button
                  type="button"
                  className="store-switch-disconnect-action"
                  onClick={() => {
                    handleDisconnectPhantom();
                    setShowSwitchModal(false);
                  }}
                  onMouseEnter={hover.onMouseEnter}
                >
                  Disconnect Wallet
                </button>
                <button
                  type="button"
                  className="btn-primary store-switch-done-action"
                  onClick={() => {
                    click.onClick();
                    setShowSwitchModal(false);
                  }}
                  onMouseEnter={hover.onMouseEnter}
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Success Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <motion.div
            className="store-receipt-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReceipt(null)}
          >
            <motion.div
              className="store-receipt-modal glass-card"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="receipt-sparkle-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h2 className="receipt-heading">Purchase Confirmed!</h2>
              <p className="receipt-subheading">
                <strong>{receipt.purchase?.amount || receipt.amount || 'DTNC'} tokens</strong> have been successfully transferred to your wallet on Solana Devnet.
              </p>

              <div className="receipt-details-box">
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Recipient Wallet</span>
                  <span className="receipt-detail-value receipt-wallet-value">
                    {receipt.purchase?.walletAddress || walletAddress}
                  </span>
                </div>

                {receipt.solPaymentSignature && (
                  <div className="receipt-detail-item">
                    <span className="receipt-detail-label">SOL Payment Signature</span>
                    <a
                      href={`https://explorer.solana.com/tx/${receipt.solPaymentSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-explorer-link"
                    >
                      <span className="receipt-sig-value">
                        {receipt.solPaymentSignature.slice(0, 12)}...{receipt.solPaymentSignature.slice(-8)}
                      </span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </a>
                  </div>
                )}

                {receipt.signature && (
                  <div className="receipt-detail-item">
                    <span className="receipt-detail-label">DTNC Delivery Signature</span>
                    <a
                      href={receipt.explorerUrl || `https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-explorer-link"
                    >
                      <span className="receipt-sig-value">
                        {receipt.signature.slice(0, 12)}...{receipt.signature.slice(-8)}
                      </span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              <motion.button
                type="button"
                className="btn-primary receipt-close-btn"
                onClick={() => { click.onClick(); setReceipt(null); }}
                onMouseEnter={hover.onMouseEnter}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                Done
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DTNCStore;
