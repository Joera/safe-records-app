// main.ts - Entry point for the Safe App
import { S2SRecordsApp } from './components/s2s-records-app';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';
import { ethers } from 'ethers';


window.SafeAppsSDK = SafeAppsSDK;
window.ethers = ethers;

// console.log('Assignment check:');
// console.log('window.SafeAppsSDK exists:', 'SafeAppsSDK' in window);
// console.log('window.SafeAppsSDK type:', typeof window.SafeAppsSDK);


// window.addEventListener('message', (event) => {
//   if (event.origin === 'https://app.safe.global') {
//     console.log('Safe parent message:', JSON.stringify(event.data, null, 2));
//   }
// }, true);

// console.log('Parent window exists:', window.parent !== window);
// console.log('Running in iframe:', window.self !== window.top);


// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {

  initializeApp();
}

function initializeApp() {
  
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.outerHTML = '<s2s-records-app></s2s-records-app>';
  }
  
  // Add some global styles
  addGlobalStyles();
  
  // Set up error handling
  setupErrorHandling();
  
  console.log('S2S Records Safe App initialized');
}

function addGlobalStyles() {
  const globalStyles = document.createElement('style');
  globalStyles.textContent = `
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #f9fafb;
      line-height: 1.6;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
    }
    pnpm a
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* Focus styles for accessibility */
    :focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  
  document.head.appendChild(globalStyles);
}

function setupErrorHandling() {
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showErrorNotification('An unexpected error occurred. Please refresh and try again.');
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorNotification('A network error occurred. Please check your connection and try again.');
  });
}

function showErrorNotification(message: string) {
  const notification = document.createElement('div        // console.log("found", moduleAddress)');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    max-width: 400px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 5000);
}

// Export for potential external use
export { initializeApp };
export { S2SRecordsApp };