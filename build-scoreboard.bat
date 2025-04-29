@echo off
echo Building scoreboard contract...

cd floppybird_contract/finaltrybird

echo Generating proto files...
npx koinos-sdk-as-cli generate-contract-proto

echo Building the contract...
npx koinos-sdk-as-cli build-all debug

echo Done!
echo Contract built at floppybird_contract/finaltrybird/build/debug/contract.wasm

cd ../..

echo Creating ABI file...
copy floppybird_scoreboard_contract-abi.json abi.json

echo All done!
pause 