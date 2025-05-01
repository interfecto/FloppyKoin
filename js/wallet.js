// js/wallet.js - Wallet integration with simplified blockchain access (v10.7)

let userAddress;
let provider;
let scoreboardContract;

// Contract address on Koinos blockchain
const SCOREBOARD_CONTRACT_ADDRESS = '15fgcbX1gEkzQfn8oErtaZFzfmBHQ7a4Aq';

// Simple ABI - just method names and entry points
const SCOREBOARD_SIMPLE_ABI = {
  methods: {
    submit_score: {
      entry_point: 0x5e812eb5
    },
    get_player_score: {
      entry_point: 0x9b549ace,
      read_only: true
    },
    get_top_scores: {
      entry_point: 0x7d6a3628,
      read_only: true
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
    
    // Create the contract instance with minimal ABI
    scoreboardContract = new window.koinos.Contract({
      id: SCOREBOARD_CONTRACT_ADDRESS,
      abi: SCOREBOARD_SIMPLE_ABI,
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
 * Direct contract call with simplified serialization
 */
async function directContractCall(methodName, args, readOnly = true) {
  if (!provider) {
    console.error('Provider not initialized');
    return null;
  }
  
  try {
    // Get entry point from ABI
    const entryPoint = SCOREBOARD_SIMPLE_ABI.methods[methodName]?.entry_point;
    if (!entryPoint) {
      throw new Error(`Unknown method: ${methodName}`);
    }
    
    // Convert args to hex string
    const argsHex = window.koinos.utils.toHexString(
      new TextEncoder().encode(JSON.stringify(args))
    );
    
    // Create contract call operation
    const callContract = {
      contract_id: SCOREBOARD_CONTRACT_ADDRESS,
      entry_point: entryPoint,
      args: argsHex
    };
    
    if (readOnly) {
      // Use readContract for read-only operations
      const result = await provider.readContract(callContract);
      
      if (result && result.result) {
        // Try to parse the result if it's JSON
        try {
          return JSON.parse(new TextDecoder().decode(
            window.koinos.utils.toUint8Array(result.result)
          ));
        } catch (e) {
          return result.result;
        }
      }
      return null;
    } else {
      // For write operations, create transaction with signer
      const signer = window.kondor.getSigner(userAddress);
      
      if (!signer) {
        throw new Error('Signer not available');
      }
      
      // Create transaction
      const transaction = new window.koinos.Transaction({
        signer: signer,
        provider: provider
      });
      
      // Add operation
      transaction.pushOperation({
        call_contract: callContract
      });
      
      // Send and wait for the transaction
      await transaction.send();
      await transaction.wait();
      
      return { success: true };
    }
  } catch (error) {
    console.error(`Contract call error (${methodName}):`, error);
    return null;
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
    
    // If we have blockchain access, try to submit
    if (provider) {
      console.log('🌐 Submitting score to blockchain:', score);
      document.getElementById('submit-score-btn').disabled = true;
      document.getElementById('submit-score-btn').textContent = 'Submitting...';
      
      const nickname = localStorage.getItem('playerNickname') || 'Player';
      
      try {
        // Try direct method first
        const result = await directContractCall('submit_score', {
          player: userAddress,
          score: score,
          nickname: nickname
        }, false); // false = not read-only
        
        if (result && result.success) {
          console.log('✅ Score submitted to blockchain successfully');
          document.getElementById('submit-score-btn').textContent = 'Submitted!';
          
          setTimeout(() => {
            document.getElementById('submit-score-btn').disabled = false;
            document.getElementById('submit-score-btn').textContent = 'Submit Score';
          }, 2000);
          
          return true;
        } else {
          throw new Error('Submission failed');
        }
      } catch (blockchainError) {
        console.error('⚠️ Blockchain submission failed:', blockchainError);
        
        // The score is already saved locally, so we can still return success
        alert('⚠️ Could not submit to blockchain, but score was saved locally. ' + 
              (blockchainError.message || 'Unknown error'));
        
        document.getElementById('submit-score-btn').disabled = false;
        document.getElementById('submit-score-btn').textContent = 'Submit Score';
        
        return localSaved; // Return true if at least local save worked
      }
    } else {
      // No blockchain connection available, already saved locally
      console.log('⚠️ No blockchain access available, using local storage only');
      alert('✅ Score saved locally (blockchain not available)');
      return localSaved;
    }
  } catch (e) {
    console.error('🔗 sendScore failed', e);
    alert('❌ Score submission failed: ' + (e.message || JSON.stringify(e)));
    
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
    if (provider) {
      try {
        console.log('🌐 Getting top scores from blockchain');
        
        // Use direct contract call
        const result = await directContractCall('get_top_scores', {
          limit: limit
        });
        
        if (result && Array.isArray(result.scores)) {
          console.log('✅ Got scores from blockchain:', result.scores.length);
          return result.scores;
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
    if (provider) {
      try {
        console.log('🌐 Getting player score from blockchain');
        
        // Use direct contract call
        const result = await directContractCall('get_player_score', {
          player: playerAddress
        });
        
        if (result && result.score) {
          console.log('✅ Got score from blockchain:', result.score);
          return result.score;
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

// Add the direct contract call for debugging
window.directContractCall = directContractCall;

// Log that wallet.js has loaded successfully
console.log('💼 Wallet.js loaded successfully - v10.7 with simplified blockchain integration'); 