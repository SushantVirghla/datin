import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AUTH_BASE_URL } from '../api/config';
import { getToken, getStoredUser } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import R4XScene from './R4XScene';
import './DTNCStore.css';

const TIERS = [
  { amount: 100, price: '0.5 SOL', priceNum: 0.5, popular: false },
  { amount: 500, price: '2.0 SOL', priceNum: 2.0, popular: true },
  { amount: 1000, price: '3.5 SOL', priceNum: 3.5, popular: false },
  { amount: 5000, price: '15.0 SOL', priceNum: 15.0, popular: false },
];

const TOKEN_MINT_ADDRESS = 'mntHo2pnnFBctoQ2AozsnZeCfjyk2ehDzwAkmFnr4s3';

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
      'Copy your Devnet wallet address and paste below to receive DTNC',
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
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [copiedMint, setCopiedMint] = useState(false);

  const hover = useHoverSound();
  const click = useClickSound();
  const user = propUser || getStoredUser();

  useEffect(() => {
    if (user?.walletAddress && !walletAddress) {
      setWalletAddress(user.walletAddress);
    }
  }, [user]);

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

  const handlePurchase = async () => {
    if (!selectedTier) {
      setError('Please select a token package first');
      return;
    }

    const trimmedWallet = walletAddress.trim();
    if (!trimmedWallet) {
      setError('Please enter your Solana wallet address');
      return;
    }

    if (trimmedWallet.length < 32 || trimmedWallet.length > 44) {
      setError('Invalid Solana wallet address (must be 32-44 characters)');
      return;
    }

    click.onClick();
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const { data } = await axios.post(
        `${AUTH_BASE_URL}/purchase-dtnc`,
        {
          walletAddress: trimmedWallet,
          amount: selectedTier.amount,
          price: selectedTier.priceNum,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000, // Allow 45s for blockchain confirmation
        }
      );

      if (data.success) {
        setReceipt(data);
        setSelectedTier(null);
      } else {
        setError(data.message || data.error || 'Purchase failed');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.message ||
        'Purchase failed. Please try again.';
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-page-root">
      {/* 1. Fullscreen interactive R4X Spline 3D Scene with DTNC Watermark */}
      <R4XScene watermark="DTNC" />

      {/* 2. Floating Top Header Pill with Wallet Guide Trigger */}
      <div className="store-floating-header">
        <div className="store-header-pill">
          <span className="store-header-coin">🪙</span>
          <div className="store-header-info">
            <h1 className="store-header-title">DATIN Coin (DTNC) Store</h1>
            <span className="store-header-desc">
              Solana Devnet Token-2022 • Mint: {TOKEN_MINT_ADDRESS.slice(0, 6)}...{TOKEN_MINT_ADDRESS.slice(-4)}
            </span>
          </div>

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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="M16 12h.01" />
              <path d="M2 10h20" />
            </svg>
            <span>Devnet Wallets & Setup</span>
          </button>
        </div>
      </div>

      {/* 3. Floating Bottom Dock (Tiers + Interactive Checkout) */}
      <div className="store-dock-wrapper">
        <motion.div
          className="store-dock-container"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Slide-up Checkout Panel when a tier is selected */}
          <AnimatePresence>
            {selectedTier && !receipt && (
              <motion.div
                className="store-checkout-panel"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
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

                <div className="store-checkout-form-row">
                  <div className="store-input-group">
                    <input
                      className="glass-input store-wallet-input"
                      type="text"
                      placeholder="Solana Devnet wallet address (e.g., 7BuU...)"
                      value={walletAddress}
                      onChange={(e) => {
                        setWalletAddress(e.target.value);
                        setError('');
                      }}
                      disabled={loading}
                    />
                    {user?.walletAddress && walletAddress !== user.walletAddress && (
                      <button
                        type="button"
                        className="store-autofill-btn"
                        onClick={() => {
                          click.onClick();
                          setWalletAddress(user.walletAddress);
                          setError('');
                        }}
                        onMouseEnter={hover.onMouseEnter}
                        title="Use wallet from your profile"
                      >
                        Auto-fill
                      </button>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    className="btn-primary store-purchase-btn"
                    onClick={handlePurchase}
                    disabled={loading || !walletAddress.trim()}
                    onMouseEnter={hover.onMouseEnter}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {loading ? (
                      <div className="chatbar-loading-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <>
                        <span>Buy {selectedTier.amount.toLocaleString()} DTNC</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Helpful Wallet Notice & Guide Link inside Checkout */}
                <div className="store-wallet-hint-row">
                  <div className="store-wallet-hint-left">
                    <span className="store-wallet-hint-icon">⚡</span>
                    <span className="store-wallet-hint-text">
                      Requires a Solana wallet with <strong>Devnet mode enabled</strong> (e.g., Phantom).
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
                    Setup Guide & Wallets ↗
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
                    whileHover={{ scale: 1.04, y: -4 }}
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
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4. Supported Devnet Wallets & Setup Guide Modal */}
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

      {/* 5. Success Receipt Modal */}
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
                {receipt.signature && (
                  <div className="receipt-detail-item">
                    <span className="receipt-detail-label">Solana Transaction Signature</span>
                    <span className="receipt-detail-value receipt-sig-value">
                      {receipt.signature}
                    </span>
                  </div>
                )}
                {receipt.explorerUrl && (
                  <div className="receipt-detail-item">
                    <span className="receipt-detail-label">Blockchain Verification</span>
                    <a
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-explorer-link"
                    >
                      <span>View Confirmed Transaction on Solana Explorer</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
