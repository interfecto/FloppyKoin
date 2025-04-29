// koilib-loader.js - Ensures koilib is loaded properly before other scripts run

(function() {
  console.log('📚 Checking for koilib...');
  
  // Function to load scripts dynamically with Promise support
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  // Check if koilib is already loaded
  if (typeof window.koilib === 'undefined') {
    console.warn('📚 koilib not detected, attempting to load it...');
    
    // Try to load koilib from CDN
    loadScript('https://cdn.jsdelivr.net/npm/koilib@5.6.0/dist/koilib.min.js')
      .then(() => {
        console.log('📚 koilib loaded successfully!');
        // Dispatch an event to notify other scripts
        document.dispatchEvent(new Event('koilibLoaded'));
      })
      .catch(err => {
        console.error('📚 Failed to load koilib:', err);
      });
  } else {
    console.log('📚 koilib already loaded!');
  }
  
  // Also check for Kondor
  if (typeof window.kondor === 'undefined') {
    console.warn('📚 Kondor not detected, attempting to load it...');
    
    // Try to load kondor from CDN
    loadScript('https://cdn.jsdelivr.net/npm/kondor-js@1.2.0/dist/kondor.min.js')
      .then(() => {
        console.log('📚 Kondor loaded successfully!');
        // Dispatch an event to notify other scripts
        document.dispatchEvent(new Event('kondorLoaded'));
      })
      .catch(err => {
        console.error('📚 Failed to load Kondor:', err);
      });
  } else {
    console.log('📚 Kondor already loaded!');
  }
})(); 