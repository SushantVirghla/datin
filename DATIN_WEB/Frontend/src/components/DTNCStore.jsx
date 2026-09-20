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

const DTNCStore = ({ user: propUser }) => {
  const [selectedTier, setSelectedTier] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

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
      // Toggle off if already selected
      setSelectedTier(null);
    } else {
      setSelectedTier(tier);
      setError('');
    }
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
                      placeholder="Solana wallet address (e.g., 7BuU...)"
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
                <strong>{receipt.purchase?.amount || receipt.amount || 'DTNC'} tokens</strong> have been successfully transferred to your wallet.
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
                    <span className="receipt-detail-label">Solana Signature</span>
                    <span className="receipt-detail-value receipt-sig-value">
                      {receipt.signature}
                    </span>
                  </div>
                )}
                {receipt.explorerUrl && (
                  <div className="receipt-detail-item">
                    <span className="receipt-detail-label">Explorer</span>
                    <a
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-explorer-link"
                    >
                      <span>View on Solana Explorer</span>
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
