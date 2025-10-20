// s2s-app.ts
import { SafeInfo } from '../types/index.js';
import { SafeIntegration } from '../lib/safe-integration.js';
import './s2s-deals-tab.js';
import './s2s-whitelist-tab.js';
import './s2s-records-tab.js';

export class S2SApp extends HTMLElement {
  private safeIntegration: SafeIntegration;
  private safeInfo: SafeInfo = { 
    safeAddress: '', 
    s2sRecords: '', 
    s2sPublication: '',
    chainId: 1, 
    network: '', 
    owners: [], 
    threshold: 1, 
    modules: [] 
  };
  private loading = true;
  private currentTab: 'deals' | 'whitelist' | 'records' = 'deals';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.safeIntegration = new SafeIntegration();
  }

  async connectedCallback() {
    console.log('S2S App initializing...');
    try {
      this.safeInfo = await this.safeIntegration.initialize();
      console.log('Safe Info:', this.safeInfo);
      this.loading = false;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.loading = false;
    }
    this.render();
  }

  private switchTab(tab: 'deals' | 'whitelist' | 'records') {
    this.currentTab = tab;
    this.render();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f9fafb;
          min-height: 100vh;
        }
        
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        
        .header {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        
        .title {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .subtitle {
          color: #6b7280;
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
        }
        
        .safe-status {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          background: #dcfce7;
          color: #166534;
        }
        
        .module-status {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.875rem;
        }
        
        .module-badge {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
        }
        
        .module-active {
          background: #dcfce7;
          color: #166534;
        }
        
        .module-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .tabs {
          display: flex;
          gap: 0.5rem;
          background: white;
          padding: 0.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }
        
        .tab {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .tab:hover {
          background: #f3f4f6;
          color: #111827;
        }
        
        .tab.active {
          background: #3b82f6;
          color: white;
        }
        
        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .tab-content {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
      </style>
      
      ${this.loading ? `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading Soul2Soul Safe App...</p>
        </div>
      ` : `
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1 class="title">
              🌐 Soul2Soul Publication Manager
            </h1>
            <p class="subtitle">Manage your publication through Safe modules</p>
            <div class="safe-status">
              ${this.safeIntegration.isConnected() ? '🟢 Connected to Safe' : '🔴 Not Connected'}
            </div>
            
            <div class="module-status">
              <div class="module-badge ${this.safeIntegration.hasPublicationModule() ? 'module-active' : 'module-inactive'}">
                ${this.safeIntegration.hasPublicationModule() ? '✅' : '❌'} Publication Module
              </div>
              <div class="module-badge ${this.safeIntegration.hasRecordsModule() ? 'module-active' : 'module-inactive'}">
                ${this.safeIntegration.hasRecordsModule() ? '✅' : '❌'} Records Module
              </div>
            </div>
          </div>

          ${!this.safeIntegration.hasPublicationModule() && !this.safeIntegration.hasRecordsModule() ? `
            <div class="error-message">
              ⚠️ No S2S modules found. Please install the Publication Module and/or Records Module first.
            </div>
          ` : ''}
          
          <!-- Tabs -->
          <div class="tabs">
            <button 
              class="tab ${this.currentTab === 'deals' ? 'active' : ''}" 
              id="deals-tab"
              ${!this.safeIntegration.hasPublicationModule() ? 'disabled' : ''}
            >
              📄 Deals
            </button>
            <button 
              class="tab ${this.currentTab === 'whitelist' ? 'active' : ''}" 
              id="whitelist-tab"
              ${!this.safeIntegration.hasPublicationModule() ? 'disabled' : ''}
            >
              👥 Whitelists
            </button>
            <button 
              class="tab ${this.currentTab === 'records' ? 'active' : ''}" 
              id="records-tab"
              ${!this.safeIntegration.hasRecordsModule() ? 'disabled' : ''}
            >
              ⚙️ Records
            </button>
          </div>
          
          <!-- Tab Content -->
          <div class="tab-content" id="tab-content"></div>
        </div>
      `}
    `;

    if (!this.loading) {
      this.attachEventListeners();
      this.renderCurrentTab();
    }
  }

  private attachEventListeners() {
    const dealsTab = this.shadowRoot?.querySelector('#deals-tab');
    const whitelistTab = this.shadowRoot?.querySelector('#whitelist-tab');
    const recordsTab = this.shadowRoot?.querySelector('#records-tab');

    dealsTab?.addEventListener('click', () => this.switchTab('deals'));
    whitelistTab?.addEventListener('click', () => this.switchTab('whitelist'));
    recordsTab?.addEventListener('click', () => this.switchTab('records'));
  }

  private renderCurrentTab() {
    const tabContent = this.shadowRoot?.querySelector('#tab-content');
    if (!tabContent) return;

    // Clear existing content
    tabContent.innerHTML = '';

    // Render appropriate tab component
    switch (this.currentTab) {
      case 'deals':
        if (this.safeIntegration.hasPublicationModule()) {
          const dealsTab = document.createElement('s2s-deals-tab');
          (dealsTab as any).safeIntegration = this.safeIntegration;
          tabContent.appendChild(dealsTab);
        }
        break;
      
      case 'whitelist':
        if (this.safeIntegration.hasPublicationModule()) {
          const whitelistTab = document.createElement('s2s-whitelist-tab');
          (whitelistTab as any).safeIntegration = this.safeIntegration;
          tabContent.appendChild(whitelistTab);
        }
        break;
      
      case 'records':
        if (this.safeIntegration.hasRecordsModule()) {
          const recordsTab = document.createElement('s2s-records-tab');
          (recordsTab as any).safeIntegration = this.safeIntegration;
          tabContent.appendChild(recordsTab);
        }
        break;
    }
  }
}

customElements.define('s2s-app', S2SApp);