// koinos-namespace.js - Creates a window.koinos namespace from individually exported globals
// This script should be loaded AFTER koilib but BEFORE any scripts that use window.koinos

(function() {
  console.log('🔧 Running koinos-namespace script...');
  
  // Check if a koinos object already exists
  if (typeof window.koinos !== 'undefined') {
    console.log('✅ window.koinos already exists, no need to create namespace');
    return;
  }
  
  // Check if the expected koilib components are available globally
  const koinosComponents = [
    'Provider', 'Signer', 'Contract', 'Transaction', 'Serializer', 'utils'
  ];
  
  const availableComponents = koinosComponents.filter(name => 
    typeof window[name] !== 'undefined'
  );
  
  if (availableComponents.length === 0) {
    console.error('❌ No koilib components detected on window. Make sure koilib is loaded first!');
    return;
  }
  
  // Create a new koinos namespace object
  window.koinos = {};
  
  // Copy all available components to the koinos namespace
  availableComponents.forEach(name => {
    window.koinos[name] = window[name];
    console.log(`➕ Added ${name} to window.koinos namespace`);
  });
  
  console.log(`✅ Created window.koinos namespace with ${availableComponents.length} components`);
})(); 