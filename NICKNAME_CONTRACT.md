# Nickname Registry Contract for KoinBird

This guide explains how to build and deploy the Nickname Registry contract for KoinBird. This contract allows players to set and retrieve nicknames on the Koinos blockchain.

## Contract Overview

The Nickname Registry contract provides two main functions:

1. `set_nickname`: Allows a player to set their own nickname
2. `get_nickname`: Retrieves a player's nickname by their address

## Building the Contract

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Koinos SDK for AssemblyScript
- Koinos CLI

### Setup Files

1. Place `nickname_registry.proto` in your `assembly/proto/` directory
2. Place `NicknameRegistry.ts` in your `assembly/` directory
3. Place `main_nickname.ts` in your `assembly/` directory (rename to `index.ts` or adjust build commands accordingly)

### Building the Contract

```bash
# Generate proto files
npx koinos-sdk-as-cli generate-contract-proto

# Build the contract in release mode
npx koinos-sdk-as-cli build-all release assembly/main_nickname.ts
```

This will generate:
- A contract.wasm file in the build/release directory
- An ABI file for the contract

## Deploying the Contract

1. Start the Koinos CLI and open your wallet:
   ```
   koinos-cli
   > open your-wallet-file.json
   ```

2. Connect to the network:
   ```
   > connect https://api.koinos.io
   ```

3. Upload the contract:
   ```
   > upload build/release/contract.wasm
   ```
   Note the contract address from the output.

4. Register the ABI:
   ```
   > register nickname_registry your-contract-address nickname_registry-abi.json
   ```

## Using the Contract

### Setting a Nickname

Using the Koinos CLI:
```
> nickname_registry.set_nickname {"player": "your-address", "nickname": "YourNickname"}
```

Using Kondor in JavaScript:
```javascript
const provider = await window.kondor.getProvider();
await provider.call(NICKNAME_REGISTRY_ADDRESS, 'set_nickname', {
  player: userAddress,
  nickname: "YourNickname"
});
```

### Getting a Nickname

Using the Koinos CLI:
```
> nickname_registry.get_nickname {"player": "player-address"}
```

Using Kondor in JavaScript:
```javascript
const provider = await window.kondor.getProvider();
const result = await provider.call(NICKNAME_REGISTRY_ADDRESS, 'get_nickname', {
  player: playerAddress
}, true); // true for read-only
console.log(result.nickname);
```

## Integrating with KoinBird

To integrate with KoinBird's leaderboard:

1. Deploy the contract and note its address
2. Update the game frontend to fetch nicknames for each player when displaying the leaderboard
3. Add a UI component to let players set their nicknames

## Frontend Integration Example

```javascript
// Fetch nickname for a player
async function getNickname(playerAddress) {
  const provider = await window.kondor.getProvider();
  try {
    const result = await provider.call(NICKNAME_REGISTRY_ADDRESS, 'get_nickname', {
      player: playerAddress
    }, true);
    return result.nickname || formatAddress(playerAddress);
  } catch (e) {
    console.error('Failed to get nickname:', e);
    return formatAddress(playerAddress);
  }
}

// Update leaderboard to show nicknames
async function updateLeaderboardWithNicknames(scores) {
  for (const score of scores) {
    // Get nickname for each player
    score.displayName = await getNickname(score.player);
  }
  
  // Update the UI with the scores and nicknames
  // ...
}
```

With this implementation, the KoinBird game can have player nicknames while keeping the existing leaderboard contract unchanged. 