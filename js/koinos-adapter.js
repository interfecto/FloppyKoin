// koinos-adapter.js - Makes koilib/koinos accessible globally
// This adapter ensures both older code expecting window.koinos and newer code works

(function() {
  console.log('⚙️ Koinos adapter initializing...');
  
  // Function to load the library from a URL
  async function loadKoinosLibrary() {
    try {
      console.log('Loading koilib from CDN...');
      
      // Use dynamic import (ESM) to load the library directly
      const KoilibModule = await import('https://cdn.jsdelivr.net/npm/koilib/dist/koilib.esm.min.js');
      
      console.log('Koilib module loaded:', KoilibModule);
      
      // Expose entire module as window.koinos
      window.koinos = KoilibModule;
      
      // Also expose as window.koilib for compatibility
      window.koilib = KoilibModule;
      
      // For convenience, expose the main classes directly on the window.koinos object
      window.koinos.Signer = KoilibModule.Signer;
      window.koinos.Provider = KoilibModule.Provider; 
      window.koinos.Contract = KoilibModule.Contract;
      window.koinos.Transaction = KoilibModule.Transaction;
      window.koinos.utils = KoilibModule.utils;
      
      console.log('✅ Koinos library successfully initialized and exposed globally');
      console.log('Available classes:', Object.keys(window.koinos));
      
      // Dispatch a custom event indicating the library is ready
      window.dispatchEvent(new CustomEvent('koinos-ready'));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load Koinos library:', error);
      return false;
    }
  }
  
  // Start loading immediately
  loadKoinosLibrary().catch(error => {
    console.error('Fatal error loading Koinos library:', error);
  });
})(); 