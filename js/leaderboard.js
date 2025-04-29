// leaderboard.js - Global leaderboard integration

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
  
  // Delayed initial refresh
  setTimeout(refreshLeaderboard, 1000);
});

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
    // Get top scores
    const scores = await window.getTopScores(maxLeaderboardEntries);
    
    if (!scores || scores.length === 0) {
      leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">No scores yet</span><span class="score">-</span></li>';
      return;
    }
    
    // Clear and populate the leaderboard
    leaderboardList.innerHTML = '';
    scores.forEach((score, index) => {
      const listItem = document.createElement('li');
      
      // Format the player address to show a shortened version
      const shortAddress = formatAddress(score.player);
      
      listItem.innerHTML = `
        <span class="rank">${index + 1}.</span>
        <span class="player" title="${score.player}">${shortAddress}</span>
        <span class="score">${score.score}</span>
      `;
      
      leaderboardList.appendChild(listItem);
    });
  } catch (error) {
    console.error('Failed to refresh leaderboard:', error);
    leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">Error loading scores</span><span class="score">-</span></li>';
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