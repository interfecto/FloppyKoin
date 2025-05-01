// contract-debug.js - Console utilities for contract interaction

// Global variables to store contract state
let debugProvider;
let debugSigner;
let debugContract;
let debugUserAddress;

// Contract address on Koinos blockchain
const DEBUG_CONTRACT_ADDRESS = '15fgcbX1gEkzQfn8oErtaZFzfmBHQ7a4Aq';

// Simplified contract ABI for testing
const DEBUG_CONTRACT_ABI = {
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
 * Initialize the debug contract interaction
 * This integrates with wallet.js if it's already loaded
 */
async function initContractDebug() {
  console.log('🔧 Initializing contract debug utilities...');
  
  // Check if wallet.js has already set up contracts
  if (typeof window.getPlayerScore === 'function' && 
      typeof window.getTopScores === 'function' && 
      typeof window.sendScore === 'function') {
    console.log('✅ Using wallet.js integration for contract functions');
    
    // Expose wallet.js functions as debug aliases
    window.getPlayerScoreFromChain = window.getPlayerScore;
    window.getTopScoresFromChain = window.getTopScores;
    window.sendScoreToChain = window.sendScore;
    
    console.log('✅ Debug utilities ready and connected to wallet.js!');
    return true;
  }
  
  // Fall back to direct koinos initialization if wallet.js isn't handling it
  console.log('⚠️ wallet.js functions not found, initializing direct contract connection');
  
  // Check if koilib (assigned from koinos) is available globally
  if (typeof window.koinos === 'undefined' || typeof window.koinos.Contract === 'undefined') {
    console.error('❌ koilib object not found or missing Contract class. Was js/koinos.min.js loaded correctly?');
    return false;
  }
  
  try {
    // Check if kondor is available
    if (typeof window.kondor === 'undefined') {
      console.error('❌ Kondor not found. Please install the Kondor extension.');
      return false;
    }

    // Get accounts from Kondor
    const accounts = await window.kondor.getAccounts();
    if (!accounts || accounts.length === 0) {
      console.error('❌ No accounts found in Kondor. Please unlock Kondor and try again.');
      return false;
    }

    debugUserAddress = accounts[0];
    console.log('✅ Connected as', debugUserAddress);

    // Get provider from Kondor
    debugProvider = window.kondor.getProvider();
    console.log('✅ Provider obtained');

    // Get signer from Kondor
    debugSigner = window.kondor.getSigner(debugUserAddress);
    if (!debugSigner) {
      console.error('❌ Failed to get signer from Kondor');
      return false;
    }
    console.log('✅ Signer obtained');

    // Initialize contract using koilib
    debugContract = new window.koinos.Contract({
      id: DEBUG_CONTRACT_ADDRESS,
      abi: DEBUG_CONTRACT_ABI,
      provider: debugProvider,
      signer: debugSigner
    });
    
    console.log('✅ Contract initialized for address:', DEBUG_CONTRACT_ADDRESS);
    console.log('✅ Debug utilities ready! You can now use:');
    console.log('   - getPlayerScoreFromChain(address) - Get a player\'s score');
    console.log('   - getTopScoresFromChain(limit) - Get top scores');
    console.log('   - sendScoreToChain(score) - Submit your score');
    
    // Make wallet.js compatible functions available
    window.getPlayerScore = getPlayerScoreFromChain;
    window.getTopScores = getTopScoresFromChain;
    window.sendScore = sendScoreToChain;
    
    return true;
  } catch (error) {
    console.error('❌ Contract debug initialization failed:', error);
    return false;
  }
}

/**
 * Get a player's score from the blockchain
 */
async function getPlayerScoreFromChain(playerAddress = debugUserAddress) {
  console.log('🏆 getPlayerScoreFromChain called for', playerAddress);

  if (!playerAddress) {
    console.error('❌ No player address provided');
    return null;
  }

  if (!debugContract) {
    console.error('❌ Contract not initialized. Please run initContractDebug() first.');
    return null;
  }

  try {
    // Call the contract read function
    const result = await debugContract.functions.get_player_score({
      player: playerAddress
    });
    
    if (result && result.result) {
      console.log('✅ Score retrieved:', result.result);
      return {
        player: playerAddress,
        score: result.result.score,
        nickname: result.result.nickname,
        timestamp: result.result.timestamp
      };
    } else {
      console.log('ℹ️ No score found for this player');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting player score:', error);
    return getScoreFromLocalStorage(playerAddress);
  }
}

/**
 * Get top scores from the blockchain
 */
async function getTopScoresFromChain(limit = 10) {
  console.log('📊 getTopScoresFromChain called with limit:', limit);

  if (!debugContract) {
    console.error('❌ Contract not initialized. Please run initContractDebug() first.');
    return [];
  }

  try {
    // Call the contract read function
    const result = await debugContract.functions.get_top_scores({
      limit: parseInt(limit, 10)
    });
    
    if (result && result.result && Array.isArray(result.result.scores)) {
      console.log('✅ Top scores retrieved:', result.result.scores);
      return result.result.scores;
    } else {
      console.log('ℹ️ No top scores found or invalid response format');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting top scores:', error);
    return getTopScoresFromLocalStorage(limit);
  }
}

/**
 * Send a score to the blockchain
 */
async function sendScoreToChain(score) {
  console.log('📝 sendScoreToChain called with score:', score);

  if (!debugUserAddress) {
    console.error('❌ No user address. Please run initContractDebug() first.');
    return false;
  }

  if (!debugContract) {
    console.error('❌ Contract not initialized. Please run initContractDebug() first.');
    return false;
  }

  try {
    const nickname = localStorage.getItem('playerNickname') || 'Player';
    const scoreNum = parseInt(score, 10);
    
    // Call the contract write function
    const result = await debugContract.functions.submit_score({
      player: debugUserAddress,
      score: scoreNum,
      nickname: nickname
    });

    console.log('✅ Score transaction sent:', result);
    
    // Wait for transaction confirmation
    if (result.transaction) {
      await result.transaction.wait();
      console.log('✅ Transaction confirmed!', result.transaction.id);
      
      // Store locally as a backup
      saveScoreToLocalStorage(debugUserAddress, scoreNum);
      return true;
    } else {
      console.error('❌ No transaction returned from contract call');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending score:', error);
    // Store locally as a fallback
    saveScoreToLocalStorage(debugUserAddress, score);
    return false;
  }
}

/**
 * Helper function to save score locally
 */
function saveScoreToLocalStorage(address, score) {
  try {
    if (!address || score <= 0) return false;
    
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
      console.log('Score saved locally:', score);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Error saving score locally:', e);
    return false;
  }
}

/**
 * Helper function to get player score from local storage
 */
function getScoreFromLocalStorage(address) {
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    return scores[address] || null;
  } catch (e) {
    console.error('Error getting score from local storage:', e);
    return null;
  }
}

/**
 * Helper function to get top scores from local storage
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
    console.error('Error getting top scores from local storage:', e);
    return [];
  }
}

// Make functions available in global scope
window.initContractDebug = initContractDebug;
window.getPlayerScoreFromChain = getPlayerScoreFromChain;
window.getTopScoresFromChain = getTopScoresFromChain;
window.sendScoreToChain = sendScoreToChain;

// Auto-initialize when wallet.js has loaded
setTimeout(() => {
  if (typeof window.connectWallet === 'function') {
    console.log('🔄 Auto-initializing contract debug integration with wallet.js');
    initContractDebug();
  } else {
    console.log('🔧 Contract debug utilities loaded. Run initContractDebug() in the console to begin.');
  }
}, 2000); 