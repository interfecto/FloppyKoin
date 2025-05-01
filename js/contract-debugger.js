// contract-debugger.js - For direct testing of contract calls
// Run these functions from the browser console

const CONTRACT_ADDRESS = '15fgcbX1gEkzQfn8oErtaZFzfmBHQ7a4Aq';

/**
 * Get contract info - verify the contract exists and get details
 */
async function getContractInfo() {
  console.log('🔍 Getting contract info for:', CONTRACT_ADDRESS);
  
  if (!window.kondor) {
    console.error('Kondor extension not available');
    return;
  }
  
  try {
    const provider = window.kondor.getProvider();
    
    // Get contract info using the chain API
    const contractInfo = await provider.call('chain.get_account_info', {
      account: CONTRACT_ADDRESS
    });
    
    console.log('Contract info:', contractInfo);
    return contractInfo;
  } catch (error) {
    console.error('Failed to get contract info:', error);
  }
}

/**
 * Debug contract read call by tracing the request and response
 */
async function debugContractCall(methodName, args) {
  console.log(`🔍 Testing contract.${methodName} with args:`, args);
  
  if (!window.kondor || !window.koinos) {
    console.error('Missing required dependencies');
    return;
  }
  
  try {
    // Get accounts 
    const accounts = await window.kondor.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    const userAddress = accounts[0].address;
    console.log('Using address:', userAddress);
    
    // Get provider and signer
    const provider = window.kondor.getProvider();
    const signer = window.kondor.getSigner(userAddress);
    
    // Create a simplified contract instance with minimal ABI
    // This avoids any serialization issues by letting Kondor handle it
    const contract = new window.koinos.Contract({
      id: CONTRACT_ADDRESS,
      provider: provider,
      signer: signer
    });
    
    // Create and serialize the operation directly
    console.log('Building operation...');
    
    // Create a contract call directly using low-level API
    const callContract = {
      contract_id: CONTRACT_ADDRESS,
      entry_point: getEntryPoint(methodName), 
      args: window.koinos.utils.toHexString(
        new TextEncoder().encode(JSON.stringify(args))
      )
    };
    
    const operation = {
      call_contract: callContract
    };
    
    console.log('Operation created:', operation);
    
    // Submit a read contract operation
    try {
      console.log('Sending read contract request...');
      const readResult = await provider.readContract(callContract);
      console.log('Read contract result:', readResult);
    } catch (readError) {
      console.error('Read contract error:', readError);
    }
    
    // Try with the regular method
    try {
      if (contract.functions[methodName]) {
        console.log(`Calling contract.functions.${methodName}...`);
        const result = await contract.functions[methodName](args);
        console.log('Function call result:', result);
        return result;
      } else {
        console.log(`Method ${methodName} not available on contract instance`);
      }
    } catch (callError) {
      console.error('Function call error:', callError);
    }
  } catch (error) {
    console.error('Debug call failed:', error);
  }
}

// Helper function to get entry point for common methods
function getEntryPoint(methodName) {
  const entryPoints = {
    'get_top_scores': 0x7d6a3628,
    'get_player_score': 0x9b549ace,
    'submit_score': 0x5e812eb5
  };
  
  return entryPoints[methodName] || 0;
}

/**
 * Get contract entry points using chain API
 */
async function getContractEntryPoints() {
  console.log('🔍 Getting contract entry points for:', CONTRACT_ADDRESS);
  
  if (!window.kondor) {
    console.error('Kondor extension not available');
    return;
  }
  
  try {
    const provider = window.kondor.getProvider();
    
    // Get contract entry points - might not be supported on all chains
    try {
      const entryPoints = await provider.call('contract_meta_store.get_contract_meta', {
        contract_id: CONTRACT_ADDRESS
      });
      
      console.log('Contract meta:', entryPoints);
    } catch (metaError) {
      console.log('Contract meta not available:', metaError);
    }
    
    // Alternative: try to query contract ABI if available
    try {
      const abiInfo = await provider.readContract({
        contract_id: CONTRACT_ADDRESS,
        entry_point: 0x82a3537f, // "abi" entry point if available
        args: ""
      });
      
      console.log('Contract ABI info:', abiInfo);
    } catch (abiError) {
      console.log('Contract ABI not available:', abiError);
    }
  } catch (error) {
    console.error('Failed to get contract entry points:', error);
  }
}

/**
 * Test get_top_scores with different parameters
 */
function testGetTopScores(limit = 10) {
  return debugContractCall('get_top_scores', { limit });
}

/**
 * Test get_player_score with the current user's address
 */
async function testGetPlayerScore() {
  if (!window.kondor) {
    console.error('Kondor extension not available');
    return;
  }
  
  try {
    const accounts = await window.kondor.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    const address = accounts[0].address;
    return debugContractCall('get_player_score', { player: address });
  } catch (error) {
    console.error('Failed to get account:', error);
  }
}

/**
 * Try various test permutations to find working parameters
 */
async function runAllTests() {
  console.log('🧪 Running all contract tests');
  
  // First get contract info
  await getContractInfo();
  
  // Try to get entry points
  await getContractEntryPoints();
  
  // Test getting player score
  await testGetPlayerScore();
  
  // Test getting top scores with different limits
  await testGetTopScores(5);
  
  console.log('🧪 All tests completed');
}

// Export functions to window for console access
window.getContractInfo = getContractInfo;
window.debugContractCall = debugContractCall;
window.getContractEntryPoints = getContractEntryPoints;
window.testGetTopScores = testGetTopScores;
window.testGetPlayerScore = testGetPlayerScore;
window.runAllTests = runAllTests;

console.log('🔧 Contract debugger loaded. Run window.runAllTests() in console to start debugging'); 