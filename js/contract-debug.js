// contract-debug.js - Console utilities for contract interaction
// Version 10.4 - Simplified to work with wallet.js mock implementation

// Global variables to store contract state
let debugUserAddress;

// Contract address on Koinos blockchain
const DEBUG_CONTRACT_ADDRESS = '15fgcbX1gEkzQfn8oErtaZFzfmBHQ7a4Aq';

/**
 * Initialize the debug contract interaction
 * This integrates with wallet.js if it's already loaded
 */
async function initContractDebug() {
  console.log('🔧 Initializing contract debug utilities...');
  
  // Check if wallet.js has already set up functions
  if (typeof window.getPlayerScore === 'function' && 
      typeof window.getTopScores === 'function' && 
      typeof window.sendScore === 'function') {
    console.log('✅ Using wallet.js functions for debugging');
    
    // Get current connected address if available
    if (typeof window.connectWallet === 'function') {
      try {
        debugUserAddress = await window.connectWallet();
      } catch (e) {
        console.log('ℹ️ No wallet connected yet');
      }
    }
    
    // Expose global debug functions that use wallet.js functions
    window.getPlayerScoreFromChain = window.getPlayerScore;
    window.getTopScoresFromChain = window.getTopScores;
    window.sendScoreToChain = window.sendScore;
    
    console.log('✅ Debug utilities ready and using wallet.js!');
    return true;
  }
  
  console.error('❌ wallet.js functions not found');
  return false;
}

/**
 * Output stats about the current localStorage data
 */
function showLocalStats() {
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    const players = Object.keys(scores);
    
    console.log('📊 Local Storage Stats:');
    console.log(`Total players: ${players.length}`);
    
    if (players.length > 0) {
      const highScore = Math.max(...Object.values(scores).map(s => s.score));
      console.log(`Highest score: ${highScore}`);
      
      console.log('Top 3 scores:');
      const topScores = [...Object.values(scores)]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      
      topScores.forEach((score, i) => {
        const nickname = score.nickname || 'Player';
        console.log(`${i+1}. ${nickname}: ${score.score}`);
      });
    }
    
    return players.length;
  } catch (e) {
    console.error('❌ Error getting local stats:', e);
    return 0;
  }
}

/**
 * Clear all scores from localStorage 
 */
function clearLocalScores() {
  try {
    localStorage.removeItem('floppykoin_scores');
    console.log('🧹 All local scores cleared');
    return true;
  } catch (e) {
    console.error('❌ Error clearing scores:', e);
    return false;
  }
}

// Make functions available in global scope
window.initContractDebug = initContractDebug;
window.showLocalStats = showLocalStats;
window.clearLocalScores = clearLocalScores;

// Auto-initialize when wallet.js has loaded
setTimeout(() => {
  if (typeof window.connectWallet === 'function') {
    console.log('🔄 Auto-initializing contract debug integration with wallet.js');
    initContractDebug();
  } else {
    console.log('🔧 Contract debug utilities loaded. Run initContractDebug() in the console to begin.');
  }
}, 2000); 