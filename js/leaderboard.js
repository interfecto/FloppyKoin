// leaderboard.js - Global leaderboard integration with nickname support

let leaderboardVisible = false;
const maxLeaderboardEntries = 10;

// Initialize the leaderboard functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏆 Leaderboard module initialized');
  
  // Get UI elements
  const leaderboardEl = document.getElementById('leaderboard');
  const leaderboardToggle = document.getElementById('leaderboard-toggle');
  
  if (!leaderboardEl || !leaderboardToggle) {
    console.error('Leaderboard elements not found in DOM');
    return;
  }
  
  // Add toggle functionality
  leaderboardToggle.addEventListener('click', () => {
    leaderboardVisible = !leaderboardVisible;
    leaderboardEl.style.display = leaderboardVisible ? 'block' : 'none';
    
    // If showing the leaderboard, refresh the data
    if (leaderboardVisible) {
      refreshLeaderboard();
    }
  });

  // Listen for wallet connection to refresh leaderboard
  const connectBtn = document.getElementById('connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      // Wait a moment for the connection to complete
      setTimeout(refreshLeaderboard, 2000);
      
      // Show nickname prompt if not set
      setTimeout(() => {
        if (!localStorage.getItem('playerNickname')) {
          promptForNickname();
        }
      }, 3000);
    });
  }

  // Refresh leaderboard when the submit button is clicked
  const submitBtn = document.getElementById('submit-score-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // There's a delay for the transaction to be processed
      setTimeout(refreshLeaderboard, 2000);
    });
  }

  // Initialize the leaderboard with a message
  const leaderboardList = document.getElementById('leaderboard-list');
  if (leaderboardList) {
    leaderboardList.innerHTML = `
      <li><span class="rank">-</span><span class="player">Connect wallet for scores</span><span class="score">-</span></li>
    `;
  }
  
  // Add nickname button to the leaderboard header
  const leaderboardHeader = document.querySelector('#leaderboard h3');
  if (leaderboardHeader) {
    const nicknameBtn = document.createElement('button');
    nicknameBtn.id = 'nickname-btn';
    nicknameBtn.innerText = '👤 Set Nickname';
    nicknameBtn.style.fontSize = '10px';
    nicknameBtn.style.marginLeft = '8px';
    nicknameBtn.style.padding = '2px 5px';
    nicknameBtn.style.backgroundColor = '#f7d51d';
    nicknameBtn.style.border = 'none';
    nicknameBtn.style.borderRadius = '3px';
    nicknameBtn.style.cursor = 'pointer';
    
    nicknameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      promptForNickname();
    });
    
    leaderboardHeader.appendChild(nicknameBtn);
  }
  
  // Delayed initial refresh
  setTimeout(refreshLeaderboard, 1000);
});

// Prompt the user to set a nickname
function promptForNickname() {
  const currentNickname = localStorage.getItem('playerNickname') || 'Player';
  const nickname = prompt(`Enter your nickname (max 12 chars):`, currentNickname);
  
  if (nickname && nickname.trim() !== '') {
    // Limit to 12 characters
    const trimmedNickname = nickname.trim().substring(0, 12);
    
    // If wallet.js provides this function, use it
    if (typeof window.setPlayerNickname === 'function') {
      window.setPlayerNickname(trimmedNickname);
    } else {
      // Fallback to direct localStorage
      localStorage.setItem('playerNickname', trimmedNickname);
    }
    
    alert(`Nickname set to: ${trimmedNickname}`);
    
    // Update the leaderboard to reflect the nickname change
    refreshLeaderboard();
  }
}

// Refresh the leaderboard with latest data from the blockchain
async function refreshLeaderboard() {
  console.log('🔄 Refreshing leaderboard...');
  const leaderboardList = document.getElementById('leaderboard-list');
  
  if (!leaderboardList) {
    console.error('Leaderboard list element not found');
    return;
  }
  
  // Show loading state
  leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">Loading scores...</span><span class="score">-</span></li>';
  
  try {
    // Check if getTopScores is available from wallet.js
    if (typeof window.getTopScores !== 'function') {
      throw new Error('getTopScores function not available');
    }
    
    // Get top scores using the wallet API
    const scores = await window.getTopScores(maxLeaderboardEntries);
    
    if (!scores || scores.length === 0) {
      leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">No scores yet</span><span class="score">-</span></li>';
      return;
    }
    
    // Clear and populate the leaderboard
    leaderboardList.innerHTML = '';
    scores.forEach((score, index) => {
      const listItem = document.createElement('li');
      
      // Format the player address or use nickname
      const displayName = score.nickname || formatAddress(score.player);
      
      listItem.innerHTML = `
        <span class="rank">${index + 1}.</span>
        <span class="player" title="${score.player}">${displayName}</span>
        <span class="score">${score.score}</span>
      `;
      
      leaderboardList.appendChild(listItem);
    });
  } catch (error) {
    console.error('Failed to refresh leaderboard:', error);
    
    // Try fallback to local storage directly
    try {
      const localScores = getLocalLeaderboard(maxLeaderboardEntries);
      
      if (localScores.length === 0) {
        leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">No scores available</span><span class="score">-</span></li>';
        return;
      }
      
      leaderboardList.innerHTML = '';
      localScores.forEach((score, index) => {
        const listItem = document.createElement('li');
        
        // Format the player address or use nickname
        const displayName = score.nickname || formatAddress(score.player);
        
        listItem.innerHTML = `
          <span class="rank">${index + 1}.</span>
          <span class="player" title="${score.player}">${displayName}</span>
          <span class="score">${score.score}</span>
        `;
        
        leaderboardList.appendChild(listItem);
      });
    } catch (fallbackError) {
      leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">Error loading scores</span><span class="score">-</span></li>';
    }
  }
}

// Get leaderboard from local storage as fallback
function getLocalLeaderboard(limit = 10) {
  try {
    const scores = JSON.parse(localStorage.getItem('floppykoin_scores') || '{}');
    
    // Convert to array and sort by score
    const scoresArray = Object.values(scores);
    
    // Sort by score (highest first)
    scoresArray.sort((a, b) => b.score - a.score);
    
    // Return only the top N scores
    return scoresArray.slice(0, limit);
  } catch (e) {
    console.error('Error getting local leaderboard:', e);
    return [];
  }
}

// Helper function to format a blockchain address for display
function formatAddress(address) {
  if (!address) return 'Unknown';
  
  // If the address is too long, truncate it 
  if (address.length > 16) {
    return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
  }
  
  return address;
}

// Make sure our functions are available globally as well
window.refreshLeaderboard = refreshLeaderboard;
window.promptForNickname = promptForNickname; 