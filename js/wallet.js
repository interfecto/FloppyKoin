// js/wallet.js - Wallet integration with blockchain and local fallback (v10.5)

let userAddress;
let provider;
let scoreboardContract;

// Contract address on Koinos blockchain
const SCOREBOARD_CONTRACT_ADDRESS = '15fgcbX1gEkzQfn8oErtaZFzfmBHQ7a4Aq';

// Define the contract ABI to interact with our scoreboard contract
const SCOREBOARD_ABI = {
  methods: {
    submit_score: {
      entry_point: 0x5e812eb5,
      argument: "submit_score_arguments",
      return: "submit_score_result"
    },
    get_player_score: {
      entry_point: 0x9b549ace,
      argument: "get_player_score_arguments",
      return: "get_player_score_result",
      read_only: true
    },
    get_top_scores: {
      entry_point: 0x7d6a3628,
      argument: "get_top_scores_arguments",
      return: "get_top_scores_result",
      read_only: true
    }
  },
  types: {
    submit_score_arguments: {
      fields: {
        player: { type: "string" },
        score: { type: "uint64" },
        nickname: { type: "string" }
      }
    },
    submit_score_result: {
      fields: {
        success: { type: "bool" }
      }
    },
    get_player_score_arguments: {
      fields: {
        player: { type: "string" }
      }
    },
    get_player_score_result: {
      fields: {
        score: { type: "uint64" },
        nickname: { type: "string" },
        timestamp: { type: "uint64" }
      }
    },
    get_top_scores_arguments: {
      fields: {
        limit: { type: "uint32" }
      }
    },
    get_top_scores_result: {
      fields: {
        scores: { rule: "repeated", type: "score_entry" }
      }
    },
    score_entry: {
      fields: {
        player: { type: "string" },
        score: { type: "uint64" },
        nickname: { type: "string" },
        timestamp: { type: "uint64" }
      }
    }
  }
};

/**
 * Initialize the wallet connection
 */
async function connectWallet() {
  console.log('🔑 connectWallet() called');
  console.log("Koinos library loaded:", typeof window.koinos !== 'undefined');
  console.log("Kondor extension detected:", typeof window.kondor !== 'undefined');

  if (!window.kondor) {
    const err = new Error('Kondor wallet extension not found – please install Kondor from the Chrome Web Store');
    console.error('🔑', err);
    alert('❌ Wallet connection failed: Kondor extension not found');
    throw err;
  }

  try {
    // Get the provider from Kondor
    provider = await window.kondor.getProvider();
    
    // Get accounts from Kondor
    const accounts = await window.kondor.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please ensure Kondor is unlocked and an account is available.');
    }

    userAddress = accounts[0].address;
    console.log('🔑 Connected as', userAddress);
    
    // Initialize the blockchain contract
    initializeContract();

    // Update UI
    const addrEl = document.getElementById('wallet-address');
    addrEl.innerText = userAddress;
    addrEl.style.opacity = 1;
    document.getElementById('submit-score-btn').disabled = false;

    return userAddress;
  } catch (e) {
    console.error('🔑 connectWallet failed', e);
    alert('❌ Wallet connection failed: ' + (e.message || 'Unknown error'));
    throw e;
  }
}

/**
 * Initialize the blockchain contract
 */
function initializeContract() {
  if (!window.koinos || !window.koinos.Contract) {
    console.error('❌ Koinos library not available for contract initialization');
    return false;
  }
  
  if (!provider) {
    console.error('❌ Provider not initialized');
    return false;
  }
  
  if (!userAddress) {
    console.error('❌ User address not available');
    return false;
  }
  
  try {
    console.log('Initializing contract:', SCOREBOARD_CONTRACT_ADDRESS);
    
    // Get signer for the connected address
    const signer = window.kondor.getSigner(userAddress);
    
    // Create the contract instance
    scoreboardContract = new window.koinos.Contract({
      id: SCOREBOARD_CONTRACT_ADDRESS,
      abi: SCOREBOARD_ABI,
      provider: provider,
      signer: signer
    });
    
    console.log('✅ Contract initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize contract:', error);
    return false;
  }
}

/**
 * Send a score to the blockchain with local storage fallback
 */
async function sendScore(score) {
  console.log('🔗 sendScore()', score);

  if (!userAddress) {
    alert('❗️ Please connect your wallet first');
    return;
  }

  try {
    // Store score in localStorage as a backup
    const localSaved = saveScoreToLocalStorage(userAddress, score);
    if (localSaved) {
      console.log('📝 Score saved locally:', score);
    }
    
    // If we have a contract initialized, try to send score to blockchain
    if (scoreboardContract) {
      console.log('🌐 Submitting score to blockchain:', score);
      document.getElementById('submit-score-btn').disabled = true;
      document.getElementById('submit-score-btn').textContent = 'Submitting...';
      
      const nickname = localStorage.getItem('playerNickname') || 'Player';
      
      try {
        // Try the blockchain transaction
        const result = await scoreboardContract.functions.submit_score({
          player: userAddress,
          score: score,
          nickname: nickname
        });
        
        console.log('🔄 Blockchain transaction result:', result);
        
        // Wait for transaction if needed
        if (result.transaction) {
          console.log('⏳ Waiting for transaction confirmation...');
          await result.transaction.wait();
          console.log('✅ Transaction confirmed');
        }
        
        console.log('✅ Score submitted to blockchain successfully');
        document.getElementById('submit-score-btn').textContent = 'Submitted!';
        
        // Reset button after delay
        setTimeout(() => {
          document.getElementById('submit-score-btn').disabled = false;
          document.getElementById('submit-score-btn').textContent = 'Submit Score';
        }, 2000);
        
        return true;
      } catch (blockchainError) {
        console.error('⚠️ Blockchain submission failed:', blockchainError);
        
        // The score is already saved locally, so we can still return success
        alert('⚠️ Could not submit to blockchain, but score was saved locally. ' + 
              (blockchainError.message || 'Unknown error'));
        
        // Reset button
        document.getElementById('submit-score-btn').disabled = false;
        document.getElementById('submit-score-btn').textContent = 'Submit Score';
        
        return localSaved; // Return true if at least local save worked
      }
    } else {
      // No blockchain connection available, already saved locally
      console.log('⚠️ No blockchain contract available, using local storage only');
      alert('✅ Score saved locally (blockchain not available)');
      return localSaved;
    }
  } catch (e) {
    console.error('🔗 sendScore failed', e);
    alert('❌ Score submission failed: ' + (e.message || JSON.stringify(e)));
    
    // Reset button if needed
    document.getElementById('submit-score-btn').disabled = false;
    document.getElementById('submit-score-btn').textContent = 'Submit Score';
    
    return false;
  }
}

/**
 * Get top scores from blockchain with local storage fallback
 */
async function getTopScores(limit = 10) {
  console.log('📊 getTopScores() called');

  try {
    // Try to get scores from blockchain first
    if (scoreboardContract) {
      try {
        console.log('🌐 Getting top scores from blockchain');
        const result = await scoreboardContract.functions.get_top_scores({
          limit: limit
        });
        
        if (result && result.result && Array.isArray(result.result.scores)) {
          console.log('✅ Got scores from blockchain:', result.result.scores.length);
          return result.result.scores;
        }
      } catch (blockchainError) {
        console.error('⚠️ Failed to get scores from blockchain:', blockchainError);
        // Continue to fallback
      }
    }
    
    // Fall back to local storage
    console.log('📝 Getting scores from local storage');
    return getTopScoresFromLocalStorage(limit);
  } catch (e) {
    console.error('📊 getTopScores failed', e);
    return getTopScoresFromLocalStorage(limit);
  }
}

/**
 * Get a player's score from blockchain or local storage
 */
async function getPlayerScore(playerAddress = userAddress) {
  console.log('🏆 getPlayerScore() called for', playerAddress);

  if (!playerAddress) {
    console.error('Player address missing');
    return null;
  }

  try {
    // Try blockchain first
    if (scoreboardContract) {
      try {
        console.log('🌐 Getting player score from blockchain');
        const result = await scoreboardContract.functions.get_player_score({
          player: playerAddress
        });
        
        if (result && result.result) {
          console.log('✅ Got score from blockchain');
          return {
            player: playerAddress,
            score: result.result.score,
            nickname: result.result.nickname,
            timestamp: result.result.timestamp
          };
        }
      } catch (blockchainError) {
        console.error('⚠️ Failed to get score from blockchain:', blockchainError);
        // Continue to fallback
      }
    }
    
    // Fall back to local storage
    console.log('📝 Getting player score from local storage');
    return getScoreFromLocalStorage(playerAddress);
  } catch (e) {
    console.error('🏆 getPlayerScore failed', e);
    return getScoreFromLocalStorage(playerAddress);
  }
}

/**
 * Set player nickname
 */
function setPlayerNickname(nickname) {
  if (!nickname) return false;
  
  try {
    localStorage.setItem('playerNickname', nickname);
    console.log('✏️ Nickname set:', nickname);
    return true;
  } catch (error) {
    console.error('❌ Error setting nickname:', error);
    return false;
  }
}

// Helper functions for local storage ------------------------------------

/**
 * Save score to local storage
 */
function saveScoreToLocalStorage(address, score) {
  if (!address || score <= 0) return false;
  
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    const nickname = localStorage.getItem('playerNickname') || 'Player';
    
    // Only save if it's a higher score
    if (!scores[address] || scores[address].score < score) {
      scores[address] = {
        player: address,
        score: score,
        nickname: nickname,
        timestamp: Date.now()
      };
      localStorage.setItem('floppykoin_scores', JSON.stringify(scores));
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('❌ Error saving score to local storage:', e);
    return false;
  }
}

/**
 * Get player score from local storage
 */
function getScoreFromLocalStorage(address) {
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    return scores[address] || null;
  } catch (e) {
    console.error('❌ Error getting score from local storage:', e);
    return null;
  }
}

/**
 * Get top scores from local storage
 */
function getTopScoresFromLocalStorage(limit = 10) {
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    
    // Convert to array and sort by score
    const scoresArray = Object.values(scores);
    
    // Sort by score (highest first)
    scoresArray.sort((a, b) => b.score - a.score);
    
    // Return only the top N scores
    return scoresArray.slice(0, limit);
  } catch (e) {
    console.error('❌ Error getting top scores from local storage:', e);
    return [];
  }
}

// Expose functions to global scope for non-module access
window.connectWallet = connectWallet;
window.sendScore = sendScore;
window.getTopScores = getTopScores;
window.getPlayerScore = getPlayerScore;
window.setPlayerNickname = setPlayerNickname;

// Log that wallet.js has loaded successfully
console.log('💼 Wallet.js loaded successfully - v10.5 with blockchain integration + local fallback'); 