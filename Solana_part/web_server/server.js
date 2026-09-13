const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

let ENCRYPTION_KEY;
if (process.env.ENCRYPTION_KEY) {
  ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  if (ENCRYPTION_KEY.length !== 32) {
    console.error('❌ ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    process.exit(1);
  }
} else {
  ENCRYPTION_KEY = crypto.randomBytes(32);
  console.warn('⚠️  No ENCRYPTION_KEY in .env - using random key');
}
const IV_LENGTH = 16;

const SOLANA_PROGRAM_ID = process.env.SOLANA_PROGRAM_ID || 'GjYcEsXqnwXdyg6wnuLisXcDMJQoU4mc83ss7sswxKm6';
const MAX_CONTENT_LENGTH = 30;
const MAX_TOKEN_LENGTH = 10;

const STORAGE_DIR = path.join(__dirname, 'storage');
const REPORTS_FILE = path.join(STORAGE_DIR, 'reports.json');
const REPORTS_BACKUP_FILE = path.join(STORAGE_DIR, 'reports.backup.json');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const USERS_BACKUP_FILE = path.join(STORAGE_DIR, 'users.backup.json');
const LIKES_FILE = path.join(STORAGE_DIR, 'likes.json');
const LIKES_BACKUP_FILE = path.join(STORAGE_DIR, 'likes.backup.json');
const COMMENTS_FILE = path.join(STORAGE_DIR, 'comments.json');
const COMMENTS_BACKUP_FILE = path.join(STORAGE_DIR, 'comments.backup.json');
const VALIDATIONS_FILE = path.join(STORAGE_DIR, 'validations.json');
const VALIDATIONS_BACKUP_FILE = path.join(STORAGE_DIR, 'validations.backup.json');
const REEVALUATIONS_FILE = path.join(STORAGE_DIR, 'reevaluations.json');
const REEVALUATIONS_BACKUP_FILE = path.join(STORAGE_DIR, 'reevaluations.backup.json');
const VERSIONS_FILE = path.join(STORAGE_DIR, 'versions.json');
const VERSIONS_BACKUP_FILE = path.join(STORAGE_DIR, 'versions.backup.json');
const REPORTS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'reports.checksum');
const USERS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'users.checksum');
const LIKES_CHECKSUM_FILE = path.join(STORAGE_DIR, 'likes.checksum');
const COMMENTS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'comments.checksum');
const VALIDATIONS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'validations.checksum');
const REEVALUATIONS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'reevaluations.checksum');
const VERSIONS_CHECKSUM_FILE = path.join(STORAGE_DIR, 'versions.checksum');

app.use(cors());
app.use(bodyParser.json());

let reports = [];
let users = [];
let likes = [];
let comments = [];
let validations = [];
let reevaluations = [];
let versions = [];

const DEMO_KEYPAIR = [21,15,249,203,216,105,73,57,168,107,219,29,207,60,183,176,241,91,91,51,108,217,235,25,112,144,225,9,97,92,41,119,25,23,49,39,246,225,103,135,242,14,170,96,174,224,76,194,140,240,185,33,40,45,135,170,164,140,80,217,55,201,208,82];

// ==================== ENCRYPTION FUNCTIONS ====================

function callDTNCTransfer(command, args) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'dtnc_transfer.py');
    const pythonProcess = spawn('python3', [pythonScript, command, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('DTNC transfer script error:', stderr);
        reject(new Error(stderr || 'DTNC transfer script failed'));
        return;
      }
      
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse DTNC transfer output:', stdout);
        reject(new Error('Failed to parse DTNC transfer response'));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateChecksum(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ==================== FILE STORAGE FUNCTIONS ====================

async function distributeValidationRewards(reportId) {
  try {
    const report = reports.find(r => r.transactionId === reportId);
    if (!report) {
      console.error('Report not found:', reportId);
      return;
    }
    
    // Check if validation is complete
    const reportValidations = validations.filter(v => v.reportId === reportId);
    
    if (reportValidations.length < parseInt(report.totalValidators)) {
      console.log('Validation not complete yet');
      return;
    }
    
    // Get validator wallet addresses
    const validatorWallets = reportValidations.map(v => v.walletAddress);
    
    // Calculate reward per validator
    const rewardPerValidator = Math.floor(parseInt(report.reward) / reportValidations.length);
    
    console.log(`💰 Distributing ${rewardPerValidator} DTNC to each of ${validatorWallets.length} validators`);
    
    // Distribute rewards
    const result = await callDTNCTransfer('distribute_rewards', [
      JSON.stringify(validatorWallets),
      rewardPerValidator.toString()
    ]);
    
    if (result.success) {
      console.log('✅ Rewards distributed successfully');
      
      // Update validation records with reward info
      reportValidations.forEach(validation => {
        validation.rewardDistributed = true;
        validation.rewardAmount = rewardPerValidator;
        validation.distributedAt = new Date().toISOString();
      });
      
      await saveValidations();
      
      // Update report status
      report.rewardsDistributed = true;
      await saveReports();
    } else {
      console.error('❌ Failed to distribute rewards:', result.error);
    }
    
  } catch (error) {
    console.error('Error distributing rewards:', error);
  }
}

async function initializeStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    const files = [
      { data: REPORTS_FILE, checksum: REPORTS_CHECKSUM_FILE, backup: REPORTS_BACKUP_FILE },
      { data: USERS_FILE, checksum: USERS_CHECKSUM_FILE, backup: USERS_BACKUP_FILE },
      { data: LIKES_FILE, checksum: LIKES_CHECKSUM_FILE, backup: LIKES_BACKUP_FILE },
      { data: COMMENTS_FILE, checksum: COMMENTS_CHECKSUM_FILE, backup: COMMENTS_BACKUP_FILE },
      { data: VALIDATIONS_FILE, checksum: VALIDATIONS_CHECKSUM_FILE, backup: VALIDATIONS_BACKUP_FILE },
      { data: REEVALUATIONS_FILE, checksum: REEVALUATIONS_CHECKSUM_FILE, backup: REEVALUATIONS_BACKUP_FILE },
      { data: VERSIONS_FILE, checksum: VERSIONS_CHECKSUM_FILE, backup: VERSIONS_BACKUP_FILE }
    ];
    
    for (const file of files) {
      try {
        await fs.access(file.data);
      } catch {
        const emptyData = JSON.stringify([]);
        const encrypted = encrypt(emptyData);
        await fs.writeFile(file.data, encrypted);
        await fs.writeFile(file.checksum, generateChecksum(encrypted));
      }
    }
    
    console.log('📁 Storage directory initialized');
  } catch (error) {
    console.error('❌ Error initializing storage:', error);
    throw error;
  }
}

async function loadFromFile(filePath, checksumPath, backupPath, storageArray) {
  try {
    const encryptedData = await fs.readFile(filePath, 'utf8');
    const storedChecksum = await fs.readFile(checksumPath, 'utf8');
    
    if (generateChecksum(encryptedData) !== storedChecksum) {
      console.warn(`⚠️  Checksum mismatch for ${filePath}! Restoring from backup...`);
      try {
        const backupData = await fs.readFile(backupPath, 'utf8');
        const decrypted = decrypt(backupData);
        const parsed = JSON.parse(decrypted);
        storageArray.length = 0;
        storageArray.push(...parsed);
        console.log(`✅ Restored from backup`);
        return;
      } catch {
        console.error('❌ Backup restoration failed');
        return;
      }
    }
    
    const decrypted = decrypt(encryptedData);
    const parsed = JSON.parse(decrypted);
    storageArray.length = 0;
    storageArray.push(...parsed);
    console.log(`✅ Loaded ${parsed.length} items from ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
  }
}

async function saveToFile(filePath, checksumPath, backupPath, storageArray) {
  try {
    try {
      const currentData = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, currentData);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    const jsonData = JSON.stringify(storageArray, null, 2);
    const encrypted = encrypt(jsonData);
    const checksum = generateChecksum(encrypted);
    
    await fs.writeFile(filePath, encrypted);
    await fs.writeFile(checksumPath, checksum);
    
    console.log(`💾 Saved ${storageArray.length} items to ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error);
    throw error;
  }
}

async function loadReports() {
  await loadFromFile(REPORTS_FILE, REPORTS_CHECKSUM_FILE, REPORTS_BACKUP_FILE, reports);
}

async function saveReports() {
  await saveToFile(REPORTS_FILE, REPORTS_CHECKSUM_FILE, REPORTS_BACKUP_FILE, reports);
}

async function loadUsers() {
  await loadFromFile(USERS_FILE, USERS_CHECKSUM_FILE, USERS_BACKUP_FILE, users);
}

async function saveUsers() {
  await saveToFile(USERS_FILE, USERS_CHECKSUM_FILE, USERS_BACKUP_FILE, users);
}

async function loadLikes() {
  await loadFromFile(LIKES_FILE, LIKES_CHECKSUM_FILE, LIKES_BACKUP_FILE, likes);
}

async function saveLikes() {
  await saveToFile(LIKES_FILE, LIKES_CHECKSUM_FILE, LIKES_BACKUP_FILE, likes);
}

async function loadComments() {
  await loadFromFile(COMMENTS_FILE, COMMENTS_CHECKSUM_FILE, COMMENTS_BACKUP_FILE, comments);
}

async function saveComments() {
  await saveToFile(COMMENTS_FILE, COMMENTS_CHECKSUM_FILE, COMMENTS_BACKUP_FILE, comments);
}

async function loadValidations() {
  await loadFromFile(VALIDATIONS_FILE, VALIDATIONS_CHECKSUM_FILE, VALIDATIONS_BACKUP_FILE, validations);
}

async function saveValidations() {
  await saveToFile(VALIDATIONS_FILE, VALIDATIONS_CHECKSUM_FILE, VALIDATIONS_BACKUP_FILE, validations);
}

async function loadReevaluations() {
  await loadFromFile(REEVALUATIONS_FILE, REEVALUATIONS_CHECKSUM_FILE, REEVALUATIONS_BACKUP_FILE, reevaluations);
}

async function saveReevaluations() {
  await saveToFile(REEVALUATIONS_FILE, REEVALUATIONS_CHECKSUM_FILE, REEVALUATIONS_BACKUP_FILE, reevaluations);
}

async function loadVersions() {
  await loadFromFile(VERSIONS_FILE, VERSIONS_CHECKSUM_FILE, VERSIONS_BACKUP_FILE, versions);
}

async function saveVersions() {
  await saveToFile(VERSIONS_FILE, VERSIONS_CHECKSUM_FILE, VERSIONS_BACKUP_FILE, versions);
}

// ==================== UTILITY FUNCTIONS ====================

function sanitizeBlockchainData(data) {
  const sanitized = {
    content: String(data.content || '').substring(0, MAX_CONTENT_LENGTH),
    tokenAddress: String(data.tokenAddress || '').substring(0, MAX_TOKEN_LENGTH),
    reward: parseInt(data.reward) || 10,
    totalValidators: parseInt(data.totalValidators) || 5
  };
  
  if (sanitized.reward <= 0) sanitized.reward = 10;
  if (sanitized.totalValidators <= 0) sanitized.totalValidators = 5;
  
  return sanitized;
}

// ==================== SOLANA INTEGRATION ====================

function callSolanaClient(command, args) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'solana_client.py');
    const pythonProcess = spawn('python3', [pythonScript, command, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        reject(new Error(stderr || 'Python script failed'));
        return;
      }
      
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse Python output:', stdout);
        reject(new Error('Failed to parse Python response'));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function storeOnSolana(data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { content, tokenAddress, reward, totalValidators, userKeypair, userEmail } = data;
      
      const keypair = userKeypair || DEMO_KEYPAIR;
      const keypairJson = JSON.stringify(keypair);
      
      console.log(`📄 Attempt ${i + 1}/${retries} - Sending to Solana blockchain...`);
      
      const result = await callSolanaClient('store', [
        keypairJson,
        content,
        tokenAddress,
        reward.toString(),
        totalValidators.toString(),
        userEmail || 'anonymous@datin.ai'
      ]);
      
      if (result.success) {
        console.log('✅ Solana response:', result);
        return result;
      }
      
      if (!result.error.includes('timeout') && !result.error.includes('Timeout')) {
        return result;
      }
      
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'Failed after multiple retries'
  };
}

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ROUTES ====================

app.post('/purchase-dtnc', authenticateToken, async (req, res) => {
  console.log('\n🪙 === NEW PURCHASE REQUEST ===');
  console.log('   User:', req.user.email);
  console.log('   Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { walletAddress, amount, price } = req.body;
    
    if (!walletAddress || !amount || !price) {
      console.log('   ❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Wallet address, amount, and price are required'
      });
    }
    
    // Validate wallet address format (basic Solana address validation)
    const walletTrimmed = walletAddress.trim();
    if (walletTrimmed.length < 32 || walletTrimmed.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(walletTrimmed)) {
      console.log('   ❌ Invalid wallet address format');
      return res.status(400).json({
        success: false,
        message: 'Invalid Solana wallet address format'
      });
    }
    
    console.log(`   Amount: ${amount} DTNC`);
    console.log(`   Price: ${price}`);
    console.log(`   Wallet: ${walletTrimmed}`);
    
    // First check if Python script and dependencies are available
    console.log('   🔍 Checking DTNC transfer system...');
    try {
      const testResult = await callDTNCTransfer('get_info', []);
      if (!testResult.success) {
        console.error('   ❌ DTNC transfer system not available:', testResult.error);
        return res.status(503).json({
          success: false,
          message: 'Token transfer system is currently unavailable',
          details: 'Please ensure Python dependencies are installed (pip3 install solana solders)',
          error: testResult.error
        });
      }
      console.log('   ✅ DTNC transfer system check passed');
    } catch (error) {
      console.error('   ❌ DTNC system check failed:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Token transfer system check failed',
        details: 'Python script or dependencies may be missing',
        error: error.message
      });
    }
    
    // Call Python script to transfer DTNC tokens
    console.log('   📤 Calling DTNC transfer script...');
    const result = await callDTNCTransfer('transfer', [
      walletTrimmed,
      amount.toString(),
      'purchase'
    ]);
    
    console.log('   📥 DTNC transfer result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      // Record purchase in database
      const purchase = {
        purchaseId: `PURCHASE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user.id,
        userEmail: req.user.email,
        walletAddress: walletTrimmed,
        amount: parseInt(amount),
        price: parseFloat(price),
        transactionSignature: result.signature,
        explorerUrl: result.explorer_url,
        createdAt: new Date().toISOString()
      };
      
      console.log('   ✅ Purchase completed:', purchase.purchaseId);
      console.log('🪙 === PURCHASE SUCCESS ===\n');
      
      res.json({
        success: true,
        message: 'DTNC tokens transferred successfully',
        purchase,
        signature: result.signature,
        explorerUrl: result.explorer_url
      });
    } else {
      console.error('   ❌ Transfer failed:', result.error);
      console.log('🪙 === PURCHASE FAILED ===\n');
      
      res.status(500).json({
        success: false,
        message: 'Failed to transfer DTNC tokens',
        error: result.error,
        details: result.details || 'Check server logs for more information'
      });
    }
    
  } catch (error) {
    console.error('   ❌ Unexpected error:', error);
    console.error('   Stack:', error.stack);
    console.log('🪙 === PURCHASE ERROR ===\n');
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during purchase',
      error: error.message
    });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, walletAddress } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required'
      });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      password: hashedPassword,
      walletAddress: walletAddress || '',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers();

    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      walletAddress: newUser.walletAddress,
      createdAt: newUser.createdAt
    };

    console.log('✅ New user registered:', userResponse.email);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during signup'
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    };

    console.log('✅ User logged in:', userResponse.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

app.get('/verify-token', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const userResponse = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt
  };

  res.json({
    success: true,
    user: userResponse
  });
});

app.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const userResponse = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt
  };

  res.json({
    success: true,
    user: userResponse
  });
});

// ==================== REPORT ROUTES ====================

app.post('/submit-report', authenticateToken, async (req, res) => {
  try {
    const { owner, content, tokenAddress, reward, totalValidators } = req.body;
    
    if (!content || !tokenAddress || !reward) {
      return res.status(400).json({
        success: false,
        message: 'Content, tokenAddress, and reward are required'
      });
    }
    
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const report = {
      transactionId,
      owner: owner || req.user.email,
      content,
      tokenAddress,
      reward,
      totalValidators: totalValidators || '5',
      status: 'pending',
      userId: req.user.id,
      userEmail: req.user.email,
      createdAt: new Date().toISOString(),
      blockchainStatus: 'processing',
      likesCount: 0,
      commentsCount: 0,
      validationStatus: 'pending',
      validatorsCount: 0,
      reevaluationCount: 0,
      currentVersion: 1,
      isEdited: false
    };
    
    reports.push(report);
    await saveReports();
    
    // Store original version
    const version = {
      versionId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId: transactionId,
      versionNumber: 1,
      content: content,
      changedBy: req.user.email,
      changeType: 'original',
      createdAt: new Date().toISOString()
    };
    versions.push(version);
    await saveVersions();
    
    console.log('📋 NEW REPORT SUBMITTED:', transactionId);
    
    res.status(200).json({
      success: true,
      transactionId,
      message: 'Report submitted successfully',
      status: 'pending',
      blockchainStatus: 'processing'
    });

    const blockchainData = sanitizeBlockchainData({
      content,
      tokenAddress,
      reward: parseInt(reward),
      totalValidators: parseInt(totalValidators || 5)
    });
    
    storeOnSolana({
      content: blockchainData.content,
      tokenAddress: blockchainData.tokenAddress,
      reward: blockchainData.reward,
      totalValidators: blockchainData.totalValidators,
      userKeypair: null,
      userEmail: req.user.email
    })
    .then(async result => {
      const reportIndex = reports.findIndex(r => r.transactionId === transactionId);
      if (reportIndex !== -1) {
        reports[reportIndex].blockchainStatus = result.success ? 'confirmed' : 'failed';
        reports[reportIndex].blockchainSignature = result.signature;
        reports[reportIndex].blockchainPDA = result.pda;
        reports[reportIndex].blockchainError = result.error;
        reports[reportIndex].blockchainAction = result.action;
        
        await saveReports();
        console.log(`✅ Blockchain update complete for ${transactionId}`);
      }
    })
    .catch(async error => {
      console.error('❌ Blockchain storage error:', error);
      const reportIndex = reports.findIndex(r => r.transactionId === transactionId);
      if (reportIndex !== -1) {
        reports[reportIndex].blockchainStatus = 'failed';
        reports[reportIndex].blockchainError = error.message;
        await saveReports();
      }
    });
    
  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/reports', authenticateToken, (req, res) => {
  const enrichedReports = reports.map(report => {
    const reportLikes = likes.filter(l => l.reportId === report.transactionId);
    const reportComments = comments.filter(c => c.reportId === report.transactionId);
    const reportValidations = validations.filter(v => v.reportId === report.transactionId);
    const reportReevaluations = reevaluations.filter(r => r.reportId === report.transactionId);
    
    return {
      ...report,
      likesCount: reportLikes.length,
      commentsCount: reportComments.length,
      validatorsCount: reportValidations.length,
      reevaluationCount: reportReevaluations.length,
      likedByCurrentUser: reportLikes.some(l => l.userId === req.user.id)
    };
  });
  
  res.json({
    success: true,
    count: enrichedReports.length,
    reports: enrichedReports
  });
});

app.get('/my-reports', authenticateToken, (req, res) => {
  const userReports = reports.filter(r => r.userId === req.user.id);
  
  res.json({
    success: true,
    count: userReports.length,
    reports: userReports
  });
});

// ==================== LIKE ROUTES ====================

app.post('/toggle-like/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reports.find(r => r.transactionId === reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    const existingLike = likes.find(l => l.reportId === reportId && l.userId === req.user.id);
    
    if (existingLike) {
      // Unlike
      const index = likes.indexOf(existingLike);
      likes.splice(index, 1);
      await saveLikes();
      
      res.json({
        success: true,
        message: 'Report unliked',
        liked: false,
        likesCount: likes.filter(l => l.reportId === reportId).length
      });
    } else {
      // Like
      const newLike = {
        likeId: `LIKE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        reportId,
        userId: req.user.id,
        userEmail: req.user.email,
        createdAt: new Date().toISOString()
      };
      
      likes.push(newLike);
      await saveLikes();
      
      res.json({
        success: true,
        message: 'Report liked',
        liked: true,
        likesCount: likes.filter(l => l.reportId === reportId).length
      });
    }
    
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== REEVALUATION PENALTY HANDLING ====================

app.post('/complete-reevaluation/:reevaluationId', authenticateToken, async (req, res) => {
  try {
    const { reevaluationId } = req.params;
    const { isCorrect } = req.body; // true if challenger was correct
    
    const reeval = reevaluations.find(r => r.reevaluationId === reevaluationId);
    if (!reeval) {
      return res.status(404).json({
        success: false,
        message: 'Reevaluation not found'
      });
    }
    
    const report = reports.find(r => r.transactionId === reeval.reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    if (isCorrect) {
      // Challenger was correct
      console.log('✅ Challenger was correct! Distributing stake + rewards...');
      
      // Transfer reward to challenger
      await callDTNCTransfer('transfer', [
        reeval.walletAddress,
        (reeval.stakeAmount + parseInt(report.reward)).toString(),
        'reevaluation_reward'
      ]);
      
      reeval.challengeResult = 'success';
      reeval.rewardDistributed = true;
      
      // TODO: Penalize previous validators (requires their authorization)
      console.log('⚠️  Previous validators should be penalized (requires manual action)');
      
    } else {
      // Challenger was wrong
      console.log('❌ Challenger was wrong! Distributing stake to validators...');
      
      // Get validators
      const reportValidations = validations.filter(v => v.reportId === reeval.reportId);
      const validatorWallets = reportValidations.map(v => v.walletAddress);
      
      // Distribute stake among submitter and validators
      const stakePerValidator = Math.floor(reeval.stakeAmount / (validatorWallets.length + 1));
      
      // Transfer to original submitter
      await callDTNCTransfer('transfer', [
        report.owner,
        stakePerValidator.toString(),
        'reevaluation_penalty'
      ]);
      
      // Transfer to validators
      await callDTNCTransfer('distribute_rewards', [
        JSON.stringify(validatorWallets),
        stakePerValidator.toString()
      ]);
      
      reeval.challengeResult = 'failed';
    }
    
    await saveReevaluations();
    
    res.json({
      success: true,
      message: 'Reevaluation completed',
      result: reeval.challengeResult
    });
    
  } catch (error) {
    console.error('Error completing reevaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/likes/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const reportLikes = likes.filter(l => l.reportId === reportId);
  
  res.json({
    success: true,
    count: reportLikes.length,
    likes: reportLikes,
    likedByCurrentUser: reportLikes.some(l => l.userId === req.user.id)
  });
});

// ==================== COMMENT ROUTES ====================

app.post('/add-comment/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    const report = reports.find(r => r.transactionId === reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    const newComment = {
      commentId: `COMMENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      userId: req.user.id,
      userEmail: req.user.email,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    
    comments.push(newComment);
    await saveComments();
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/comments/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const reportComments = comments.filter(c => c.reportId === reportId);
  
  res.json({
    success: true,
    count: reportComments.length,
    comments: reportComments
  });
});

// ==================== EDIT CONTENT ROUTE ====================

app.put('/edit-content/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }
    
    const report = reports.find(r => r.transactionId === reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    if (report.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reports'
      });
    }
    
    // Store old content as version
    const version = {
      versionId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      versionNumber: report.currentVersion + 1,
      content: content.trim(),
      changedBy: req.user.email,
      changeType: 'edit',
      createdAt: new Date().toISOString()
    };
    versions.push(version);
    await saveVersions();
    
    // Update report
    report.content = content.trim();
    report.isEdited = true;
    report.lastEditedAt = new Date().toISOString();
    report.currentVersion = version.versionNumber;
    await saveReports();
    
    res.json({
      success: true,
      message: 'Content updated successfully',
      report
    });
    
  } catch (error) {
    console.error('Error editing content:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== VALIDATION ROUTES ====================

app.post('/validate/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress || walletAddress.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    const report = reports.find(r => r.transactionId === reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Check if user already validated this report
    const existingValidation = validations.find(v => v.reportId === reportId && v.userId === req.user.id);
    if (existingValidation) {
      return res.status(400).json({
        success: false,
        message: 'You have already validated this report'
      });
    }
    
    const newValidation = {
      validationId: `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      userId: req.user.id,
      userEmail: req.user.email,
      walletAddress: walletAddress.trim(),
      isValid: true,
      createdAt: new Date().toISOString(),
      blockchainStatus: 'pending'
    };
    
    validations.push(newValidation);
    await saveValidations();
    
    // Update report validation status
    const reportValidations = validations.filter(v => v.reportId === reportId);
    report.validatorsCount = reportValidations.length;
    
    if (report.validatorsCount >= parseInt(report.totalValidators)) {
      report.validationStatus = 'validated';
    }
    
    await saveReports();
    
    res.json({
      success: true,
      message: 'Validation submitted successfully',
      validation: newValidation,
      validatorsCount: report.validatorsCount,
      validationStatus: report.validationStatus
    });
    
  } catch (error) {
    console.error('Error validating report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/validations/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const reportValidations = validations.filter(v => v.reportId === reportId);
  
  res.json({
    success: true,
    count: reportValidations.length,
    validations: reportValidations
  });
});

// ==================== REEVALUATION ROUTES ====================

app.post('/validate/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress || walletAddress.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    const report = reports.find(r => r.transactionId === reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Check if user already validated this report
    const existingValidation = validations.find(v => v.reportId === reportId && v.userId === req.user.id);
    if (existingValidation) {
      return res.status(400).json({
        success: false,
        message: 'You have already validated this report'
      });
    }
    
    const newValidation = {
      validationId: `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      userId: req.user.id,
      userEmail: req.user.email,
      walletAddress: walletAddress.trim(),
      isValid: true,
      createdAt: new Date().toISOString(),
      blockchainStatus: 'pending',
      rewardDistributed: false
    };
    
    validations.push(newValidation);
    await saveValidations();
    
    // Update report validation status
    const reportValidations = validations.filter(v => v.reportId === reportId);
    report.validatorsCount = reportValidations.length;
    
    if (report.validatorsCount >= parseInt(report.totalValidators)) {
      report.validationStatus = 'validated';
      
      // 🎯 AUTOMATICALLY DISTRIBUTE REWARDS
      console.log('🎯 Validation complete! Distributing rewards...');
      distributeValidationRewards(reportId);
    }
    
    await saveReports();
    
    res.json({
      success: true,
      message: 'Validation submitted successfully',
      validation: newValidation,
      validatorsCount: report.validatorsCount,
      validationStatus: report.validationStatus
    });
    
  } catch (error) {
    console.error('Error validating report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


app.get('/reevaluations/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const reportReevaluations = reevaluations.filter(r => r.reportId === reportId);
  
  res.json({
    success: true,
    count: reportReevaluations.length,
    reevaluations: reportReevaluations
  });
});

// ==================== VERSION/ARCHIVE ROUTES ====================

app.get('/versions/:reportId', authenticateToken, (req, res) => {
  const { reportId } = req.params;
  const reportVersions = versions.filter(v => v.reportId === reportId);
  
  // Sort by version number descending (latest first)
  reportVersions.sort((a, b) => b.versionNumber - a.versionNumber);
  
  res.json({
    success: true,
    count: reportVersions.length,
    versions: reportVersions
  });
});

app.get('/version/:versionId', authenticateToken, (req, res) => {
  const { versionId } = req.params;
  const version = versions.find(v => v.versionId === versionId);
  
  if (!version) {
    return res.status(404).json({
      success: false,
      message: 'Version not found'
    });
  }
  
  res.json({
    success: true,
    version
  });
});

// ==================== UTILITY ROUTES ====================

app.get('/transaction-status/:txId', (req, res) => {
  const report = reports.find(r => r.transactionId === req.params.txId);
  
  if (report) {
    res.json({
      success: true,
      report
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }
});

// ==================== GET TOKEN DECIMALS ====================

app.get('/dtnc-info', async (req, res) => {
  try {
    const result = await callDTNCTransfer('get_decimals', []);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/users', (req, res) => {
  const usersWithoutPasswords = users.map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    walletAddress: u.walletAddress,
    createdAt: u.createdAt
  }));

  res.json({
    success: true,
    count: users.length,
    users: usersWithoutPasswords
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    storage: 'Encrypted File Storage',
    reportsCount: reports.length,
    usersCount: users.length,
    likesCount: likes.length,
    commentsCount: comments.length,
    validationsCount: validations.length,
    reevaluationsCount: reevaluations.length,
    versionsCount: versions.length,
    blockchainIntegration: 'active',
    programId: SOLANA_PROGRAM_ID,
    maxContentLength: MAX_CONTENT_LENGTH,
    maxTokenLength: MAX_TOKEN_LENGTH
  });
});

app.get('/reports-debug', (req, res) => {
  res.json({
    success: true,
    count: reports.length,
    reports: reports
  });
});

// ==================== START SERVER ====================

async function startServer() {
  try {
    await initializeStorage();
    await loadReports();
    await loadUsers();
    await loadLikes();
    await loadComments();
    await loadValidations();
    await loadReevaluations();
    await loadVersions();
    
    console.log(`✅ Loaded all data from encrypted storage`);
    console.log(`   Reports: ${reports.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Likes: ${likes.length}`);
    console.log(`   Comments: ${comments.length}`);
    console.log(`   Validations: ${validations.length}`);
    console.log(`   Reevaluations: ${reevaluations.length}`);
    console.log(`   Versions: ${versions.length}`);
    
    app.listen(PORT, () => {
      console.log('='.repeat(80));
      console.log('🚀 DATIN BACKEND SERVER STARTED - ENHANCED VERSION');
      console.log('='.repeat(80));
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`🔐 Auth endpoints: /signup, /login, /verify-token`);
      console.log(`📊 Report endpoints: /submit-report, /reports, /my-reports`);
      console.log(`👍 Social endpoints: /toggle-like, /add-comment, /likes, /comments`);
      console.log(`✅ Validation endpoints: /validate, /validations`);
      console.log(`🔄 Reevaluation endpoints: /reevaluate, /reevaluations`);
      console.log(`📝 Edit endpoint: /edit-content`);
      console.log(`📚 Archive endpoints: /versions, /version`);
      console.log(`⛓️  Blockchain: ${SOLANA_PROGRAM_ID}`);
      console.log('='.repeat(80));
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();