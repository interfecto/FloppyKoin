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
    set_leaderboard: {
      entry_point: 0x5e812eb5,
      argument: "set_leaderboard_arguments",
      return: "empty_object"
    },
    get_leaderboard: {
      entry_point: 0x9b549ace,
      argument: "get_leaderboard_arguments",
      return: "leaderboard_entry",
      read_only: true
    },
    get_top_scores: {
      entry_point: 0x7d6a3628,
      argument: "get_top_scores_arguments",
      return: "get_top_scores_result",
      read_only: true
    }
  }
};

/**
 * Initialize the debug contract interaction
 * This loads koilib directly rather than relying on window.koilib
 */
async function initContractDebug() {
  console.log('🔧 Initializing contract debug utilities...');
  
  try {
    // Check if kondor is available
    if (typeof kondor === 'undefined') {
      console.error('❌ Kondor not found. Please install the Kondor extension.');
      return false;
    }

    // Load koilib directly
    await loadKoilibDirectly();

    // Get accounts from Kondor
    const accounts = await kondor.getAccounts();
    if (!accounts || accounts.length === 0) {
      console.error('❌ No accounts found in Kondor. Please unlock Kondor and try again.');
      return false;
    }

    debugUserAddress = accounts[0].address;
    console.log('✅ Connected as', debugUserAddress);

    // Get provider from Kondor
    debugProvider = kondor.getProvider();
    console.log('✅ Provider obtained');

    // Get signer from Kondor
    debugSigner = await kondor.getSigner(debugUserAddress);
    if (!debugSigner) {
      console.error('❌ Failed to get signer from Kondor');
      return false;
    }
    console.log('✅ Signer obtained');

    // Initialize contract using global koilib (should be available after loadKoilibDirectly)
    debugContract = new koilib.Contract({
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
    
    return true;
  } catch (error) {
    console.error('❌ Contract debug initialization failed:', error);
    return false;
  }
}

/**
 * Load koilib directly into the global scope
 */
async function loadKoilibDirectly() {
  return new Promise((resolve, reject) => {
    // Skip if koilib is already available
    if (typeof koilib !== 'undefined' && koilib.Contract) {
      console.log('✅ Koilib already available');
      return resolve();
    }
    
    console.log('⏳ Loading koilib directly...');
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/koilib@5.5.5/dist/koinos.min.js';
    script.onload = () => {
      // Check if koilib is defined and properly loaded
      if (typeof koilib === 'undefined') {
        console.error('❌ Koilib loaded but not defined in global scope');
        // Try to access the library via a different method
        fetch('https://cdn.jsdelivr.net/npm/koilib@5.5.5/dist/koinos.min.js')
          .then(response => response.text())
          .then(text => {
            const patchedText = text + '\nwindow.koilib = koilib;'; // Force global assignment
            const blob = new Blob([patchedText], {type: 'text/javascript'});
            const url = URL.createObjectURL(blob);
            const script2 = document.createElement('script');
            script2.src = url;
            script2.onload = () => {
              console.log('✅ Koilib patched and loaded manually');
              if (typeof koilib !== 'undefined') {
                resolve();
              } else {
                reject(new Error('Failed to load koilib even with patching'));
              }
            };
            script2.onerror = (e) => reject(e);
            document.body.appendChild(script2);
          })
          .catch(reject);
      } else {
        console.log('✅ Koilib loaded successfully');
        resolve();
      }
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
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
    const { result } = await debugContract.functions.get_leaderboard({
      account: playerAddress
    });
    
    if (result) {
      console.log('✅ Score retrieved:', result);
      return {
        player: playerAddress,
        score: result.score,
        nickname: result.nickname,
        timestamp: result.timestamp
      };
    } else {
      console.log('ℹ️ No score found for this player');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting player score:', error);
    return null;
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
    
    if (result && result.result && Array.isArray(result.result.entries)) {
      console.log('✅ Top scores retrieved:', result.result.entries);
      return result.result.entries;
    } else {
      console.log('ℹ️ No top scores found or invalid response format');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting top scores:', error);
    return [];
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
    const result = await debugContract.functions.set_leaderboard({
      account: debugUserAddress,
      score: scoreNum,
      nickname: nickname,
      timestamp: Date.now()
    });

    console.log('✅ Score transaction sent:', result);
    
    // Wait for transaction confirmation
    if (result.transaction) {
      await result.transaction.wait();
      console.log('✅ Transaction confirmed!', result.transaction.id);
      return true;
    } else {
      console.error('❌ No transaction returned from contract call');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending score:', error);
    return false;
  }
}

// Make functions available in global scope
window.initContractDebug = initContractDebug;
window.getPlayerScoreFromChain = getPlayerScoreFromChain;
window.getTopScoresFromChain = getTopScoresFromChain;
window.sendScoreToChain = sendScoreToChain;

// Log success
console.log('🔧 Contract debug utilities loaded. Run initContractDebug() in the console to begin.'); 