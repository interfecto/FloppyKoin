// koinos-adapter.js - Makes koilib/koinos accessible globally
// This adapter ensures both older code expecting window.koinos and newer code works

(function() {
  console.log('⚙️ Koinos adapter initializing...');
  
  // Function to load the library using traditional script tag (fallback method)
  function loadScriptTag(url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading script from ${url}...`);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        console.log(`Successfully loaded script from ${url}`);
        resolve(true);
      };
      script.onerror = (err) => {
        console.error(`Failed to load script from ${url}`, err);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }
  
  // Function to load the library from a URL
  async function loadKoinosLibrary() {
    try {
      // Try the direct CDN approach first (UMD version)
      try {
        await loadScriptTag('https://unpkg.com/koilib/dist/koinos.min.js');
        
        // Check if window.koinos is now available
        if (typeof window.koinos !== 'undefined') {
          console.log('Successfully loaded koinos library via unpkg CDN');
          
          // Make window.koilib point to the same object for compatibility
          window.koilib = window.koinos;
          
          console.log('✅ Koinos library successfully initialized and exposed globally');
          console.log('Available objects:', Object.keys(window.koinos));
          
          // Dispatch a custom event indicating the library is ready
          window.dispatchEvent(new CustomEvent('koinos-ready'));
          
          return true;
        }
      } catch (e) {
        console.warn('Failed to load from unpkg, trying jsdelivr...');
      }
      
      // Try jsdelivr as fallback
      try {
        await loadScriptTag('https://cdn.jsdelivr.net/npm/koilib/dist/koinos.min.js');
        
        // Check if window.koinos is now available
        if (typeof window.koinos !== 'undefined') {
          console.log('Successfully loaded koinos library via jsdelivr CDN');
          
          // Make window.koilib point to the same object for compatibility
          window.koilib = window.koinos;
          
          console.log('✅ Koinos library successfully initialized and exposed globally');
          console.log('Available objects:', Object.keys(window.koinos));
          
          // Dispatch a custom event indicating the library is ready
          window.dispatchEvent(new CustomEvent('koinos-ready'));
          
          return true;
        }
      } catch (e) {
        console.warn('Failed to load from jsdelivr, trying local file...');
      }
      
      // Try local file as last resort
      try {
        await loadScriptTag('js/koinos.min.js');
        
        // Check if window.koinos is now available
        if (typeof window.koinos !== 'undefined') {
          console.log('Successfully loaded koinos library from local file');
          
          // Make window.koilib point to the same object for compatibility
          window.koilib = window.koinos;
          
          console.log('✅ Koinos library successfully initialized and exposed globally');
          console.log('Available objects:', Object.keys(window.koinos));
          
          // Dispatch a custom event indicating the library is ready
          window.dispatchEvent(new CustomEvent('koinos-ready'));
          
          return true;
        }
      } catch (e) {
        console.error('Failed to load from local file', e);
      }
      
      // If we got here, all methods failed
      console.error('❌ All attempts to load Koinos library failed');
      
      // Create a stub implementation for basic functionality
      console.log('Creating stub implementation for basic functionality...');
      window.koinos = window.koinos || {
        Provider: function() { 
          console.warn('Using stub Provider implementation');
          return {}; 
        },
        Signer: function() { 
          console.warn('Using stub Signer implementation');
          return { 
            setAddress: function() {} 
          }; 
        },
        Contract: function() { 
          console.warn('Using stub Contract implementation');
          return {}; 
        },
        utils: {},
        isStub: true
      };
      window.koilib = window.koinos;
      
      // Still dispatch the event to let app continue with limited functionality
      window.dispatchEvent(new CustomEvent('koinos-ready'));
      
      return false;
    } catch (error) {
      console.error('❌ Fatal error loading Koinos library:', error);
      
      // Create a minimal stub as last resort
      window.koinos = window.koinos || { isStub: true };
      window.koilib = window.koinos;
      
      // Still dispatch the event to let app continue with limited functionality
      window.dispatchEvent(new CustomEvent('koinos-ready'));
      
      return false;
    }
  }
  
  // Start loading immediately
  loadKoinosLibrary().catch(error => {
    console.error('Fatal error loading Koinos library:', error);
  });
})(); 