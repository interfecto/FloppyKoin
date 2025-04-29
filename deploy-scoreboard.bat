@echo off
echo Preparing to deploy scoreboard contract...
echo.

echo ==== STEP 1: Install Koinos CLI (if not already installed) ====
echo In an administrator PowerShell window, run:
echo npm install -g @koinos/cli
echo.

echo ==== STEP 2: Manual Deployment Instructions ====
echo 1. Start the Koinos CLI:
echo    koinos-cli
echo.
echo 2. Open your wallet file:
echo    open your-wallet-file.json
echo    (Enter your password when prompted)
echo.
echo 3. Connect to the Koinos network:
echo    connect https://api.koinos.io
echo.
echo 4. Upload the contract:
echo    upload %CD:\=/%/floppybird_contract/finaltrybird/build/debug/contract.wasm
echo.
echo 5. Note the CONTRACT_ADDRESS from the output!
echo.
echo 6. Register the ABI:
echo    register finaltrybird CONTRACT_ADDRESS %CD:\=/%/floppybird_scoreboard_contract-abi.json
echo.
echo 7. Test that the contract works:
echo    finaltrybird.get_top_scores {"limit": 10}
echo.

echo ==== STEP 3: Update wallet.js with new contract address ====
echo Open js/wallet.js and update:
echo const SCOREBOARD_CONTRACT_ADDRESS = 'your-new-contract-address';
echo.

echo ==== STEP 4: Commit and push changes to GitHub ====
echo git add js/wallet.js
echo git commit -m "Update contract address to new deployment"
echo git push origin gh-pages
echo.

pause 