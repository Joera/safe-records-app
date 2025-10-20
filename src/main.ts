// main.ts
import { ethers } from 'ethers';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

// Set globals FIRST
window.SafeAppsSDK = SafeAppsSDK;
window.ethers = ethers;

// Import components AFTER globals are set
import './components/s2s-app.js';
import './components/s2s-deals-tab.js';
import './components/s2s-whitelist-tab.js';
import './components/s2s-records-tab.js';

console.log('Soul2Soul Safe App loaded');

// Check if custom elements are defined
console.log('s2s-app defined?', customElements.get('s2s-app'));

// Function to initialize app
function initApp() {
  console.log('Initializing app...');
  
  // Check if element already exists in HTML
  let app = document.querySelector('s2s-app');
  
  if (!app) {
    console.log('Creating s2s-app element dynamically');
    app = document.createElement('s2s-app');
    document.body.appendChild(app);
  } else {
    console.log('s2s-app element found in HTML');
  }
  
  console.log('App element:', app);
  console.log('Has shadowRoot?', !!app.shadowRoot);
}

// Try multiple approaches to ensure initialization
if (document.readyState === 'loading') {
  console.log('DOM still loading, waiting...');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('DOM already loaded, initializing immediately');
  initApp();
}

// Fallback: Also try after a short delay for iframe contexts
setTimeout(() => {
  console.log("timeout")
  if (!document.querySelector('s2s-app')?.shadowRoot) {
    console.log('Fallback initialization');
    initApp();
  }
}, 100);