import { getTopScores, getPlayerScore } from './wallet.js';

let leaderboardVisible = false;
const maxLeaderboardEntries = 10;

// Initialize the leaderboard functionality
document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const leaderboardEl = document.getElementById('leaderboard');
  const leaderboardToggle = document.getElementById('leaderboard-toggle');
  const leaderboardList = document.getElementById('leaderboard-list');

  // Add toggle functionality
  leaderboardToggle.addEventListener('click', () => {
    leaderboardVisible = !leaderboardVisible;
    leaderboardEl.style.display = leaderboardVisible ? 'block' : 'none';
    
    // If showing the leaderboard, refresh the data
    if (leaderboardVisible) {
      refreshLeaderboard();
    }
  });

  // Refresh leaderboard when the submit button is clicked
  const submitBtn = document.getElementById('submit-score-btn');
  submitBtn.addEventListener('click', () => {
    // There's a delay for the transaction to be processed
    setTimeout(refreshLeaderboard, 2000);
  });

  // Initial refresh
  refreshLeaderboard();
});

// Refresh the leaderboard with latest data from the blockchain
async function refreshLeaderboard() {
  console.log('🔄 Refreshing leaderboard...');
  const leaderboardList = document.getElementById('leaderboard-list');
  
  // Show loading state
  leaderboardList.innerHTML = '<li><span class="rank">-</span><span class="player">Loading...</span><span class="score">-</span></li>';
  
  try {
    // Get top scores from the blockchain
    const scores = await getTopScores(maxLeaderboardEntries);
    
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

// Export functions for use in other modules
export { refreshLeaderboard }; 