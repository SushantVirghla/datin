import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DTNCStore = () => {
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const navigate = useNavigate();

  // DTNC Packages
  const packages = [
    { id: 1, tokens: 100, price: 10, popular: false },
    { id: 2, tokens: 500, price: 45, popular: true, discount: '10%' },
    { id: 3, tokens: 1000, price: 85, popular: false, discount: '15%' },
    { id: 4, tokens: 5000, price: 400, popular: false, discount: '20%' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('datinToken');
    const userData = localStorage.getItem('datinUser');
    
    if (!token || !userData) {
      alert('Please login first');
      navigate('/');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setWalletAddress(parsedUser.walletAddress || '');
  }, [navigate]);

  const handleBuyClick = (pkg) => {
    setSelectedPackage(pkg);
    setAmount(pkg.tokens.toString());
    setShowWalletModal(true);
  };

  const handleCustomBuy = () => {
    if (!amount || parseInt(amount) < 10) {
      alert('Minimum purchase is 10 DTNC tokens');
      return;
    }
    setSelectedPackage({ tokens: parseInt(amount), price: parseInt(amount) * 0.1 });
    setShowWalletModal(true);
  };

  const handlePurchase = async () => {
    if (!walletAddress.trim()) {
      alert('Please enter your wallet address');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('datinToken');
      
      const response = await fetch('http://localhost:3001/purchase-dtnc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
          amount: selectedPackage.tokens,
          price: selectedPackage.price
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Success! ${selectedPackage.tokens} DTNC tokens will be sent to your wallet: ${walletAddress}`);
        setShowWalletModal(false);
        setAmount('');
        setSelectedPackage(null);
      } else {
        alert(`❌ Error: ${data.message || 'Purchase failed'}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('❌ Failed to process purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo} onClick={() => navigate('/')}>DATIN</div>
        <h1 style={styles.title}>DTNC Token Store</h1>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.infoSection}>
          <h2 style={styles.sectionTitle}>💎 What is DTNC?</h2>
          <p style={styles.infoText}>
            DTNC is the native token of our platform. 
            Use DTNC to submit reports, validate content, and earn rewards!
          </p>
          <div style={styles.benefitsList}>
            <div style={styles.benefit}>✓ Submit threat intelligence reports</div>
            <div style={styles.benefit}>✓ Validate and earn rewards</div>
            <div style={styles.benefit}>✓ Challenge existing reports</div>
            <div style={styles.benefit}>✓ Access premium features</div>
          </div>
        </div>

        <div style={styles.packagesSection}>
          <h2 style={styles.sectionTitle}>🎁 DTNC Packages</h2>
          <div style={styles.packagesGrid}>
            {packages.map((pkg) => (
              <div key={pkg.id} style={{
                ...styles.packageCard,
                ...(pkg.popular ? styles.popularCard : {})
              }}>
                {pkg.popular && <div style={styles.popularBadge}>POPULAR</div>}
                <div style={styles.packageTokens}>{pkg.tokens}</div>
                <div style={styles.packageLabel}>DTNC</div>
                {pkg.discount && (
                  <div style={styles.discountBadge}>Save {pkg.discount}</div>
                )}
                <div style={styles.packagePrice}>${pkg.price}</div>
                <button 
                  style={styles.buyBtn}
                  onClick={() => handleBuyClick(pkg)}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.customSection}>
          <h3 style={styles.customTitle}>Custom Amount</h3>
          <div style={styles.customInputGroup}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (min 10 DTNC)"
              style={styles.customInput}
              min="10"
            />
            <button style={styles.customBtn} onClick={handleCustomBuy}>
              Purchase Custom Amount
            </button>
          </div>
          <p style={styles.customNote}>Rate: 1 DTNC = $0.10</p>
        </div>
      </div>

      {/* Wallet Address Modal */}
      {showWalletModal && (
        <div style={styles.modalOverlay} onClick={() => setShowWalletModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Enter Wallet Address</h2>
              <button style={styles.closeBtn} onClick={() => setShowWalletModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                You are purchasing <strong>{selectedPackage?.tokens} DTNC</strong> for <strong>${selectedPackage?.price}</strong>
              </p>
              <label style={styles.label}>Wallet Address:</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your Solana wallet address"
                style={styles.walletInput}
              />
              <p style={styles.warningText}>
                ⚠️ Tokens will be sent to this address. Make sure it's correct!
              </p>
              <button 
                style={styles.confirmBtn}
                onClick={handlePurchase}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a14',
    color: '#e0e0e0',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 5%',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: '#121212',
  },
  logo: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '2rem',
    fontWeight: 700,
    background: 'linear-gradient(to right, #00ffaa, #0088ff)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    cursor: 'pointer',
  },
  title: {
    fontSize: '1.8rem',
    margin: 0,
  },
  backBtn: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#00ffaa',
    border: '1px solid #00ffaa',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 5%',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '3rem',
    border: '1px solid rgba(0, 255, 170, 0.2)',
  },
  sectionTitle: {
    color: '#00ffaa',
    marginBottom: '1rem',
  },
  infoText: {
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  benefitsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  benefit: {
    padding: '0.5rem',
    color: '#00ffaa',
  },
  packagesSection: {
    marginBottom: '3rem',
  },
  packagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  packageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
    position: 'relative',
    transition: 'transform 0.3s, border-color 0.3s',
    cursor: 'pointer',
  },
  popularCard: {
    borderColor: '#00ffaa',
    boxShadow: '0 0 20px rgba(0, 255, 170, 0.3)',
  },
  popularBadge: {
    position: 'absolute',
    top: '-10px',
    right: '10px',
    backgroundColor: '#00ffaa',
    color: '#0a0a14',
    padding: '0.3rem 0.8rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  packageTokens: {
    fontSize: '3rem',
    fontWeight: 700,
    color: '#00ffaa',
  },
  packageLabel: {
    fontSize: '1rem',
    marginBottom: '1rem',
    color: '#888',
  },
  discountBadge: {
    display: 'inline-block',
    backgroundColor: '#ffcc00',
    color: '#0a0a14',
    padding: '0.3rem 0.8rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  packagePrice: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  buyBtn: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: '#00ffaa',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1rem',
  },
  customSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  customTitle: {
    color: '#00ffaa',
    marginBottom: '1rem',
  },
  customInputGroup: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
  },
  customInput: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '1rem',
  },
  customBtn: {
    padding: '0.8rem 1.5rem',
    backgroundColor: '#0088ff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  customNote: {
    color: '#888',
    fontSize: '0.9rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    border: '1px solid rgba(0, 255, 170, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '2rem',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '2rem',
  },
  modalText: {
    marginBottom: '1.5rem',
    fontSize: '1.1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#00ffaa',
    fontWeight: 600,
  },
  walletInput: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  warningText: {
    color: '#ffcc00',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  confirmBtn: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#00ffaa',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1.1rem',
  },
};

export default DTNCStore;