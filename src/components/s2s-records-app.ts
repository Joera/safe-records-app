// s2s-records-app.ts
import { S2SRecord, SafeInfo, EditRecordEvent, SaveRecordEvent } from '../types/index.js';
import { SafeIntegration } from '../lib/safe-integration.js';
import './s2s-record-item.js';

export class S2SRecordsApp extends HTMLElement {
  private records: S2SRecord[] = [];
  private filteredRecords: S2SRecord[] = [];
  private loading = true;
  private searchTerm = '';
  private editingKey: string | null = null;
  private safeIntegration: SafeIntegration;
  private safeInfo: SafeInfo = { safeAddress: '', s2sRecords: '', chainId: 1, network: '', owners: [], threshold: 1, modules : [] };


  constructor() {

    super();
    this.safeIntegration = new SafeIntegration();
    try {
     
      this.attachShadow({ mode: 'open' });
      this.safeIntegration = new SafeIntegration();
    } catch (error) {
    }
  }

  async connectedCallback() {
    console.log('connectedCallback called');
    try {
      this.safeInfo = await this.safeIntegration.initialize();
      console.log(this.safeInfo)
      await this.loadRecords();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.loading = false;
    }
    this.render();
  }
    

  private async loadRecords() {
    this.loading = true;
    this.render();
    try {
      if (this.safeIntegration.isConnected()) {
        // Load real records from contract

        const [keys, values] = await this.safeIntegration.getAllRecords();

        this.records = keys.map((key: string, index: number) => ({
          key,
          value: values[index],
          type: this.determineRecordType(key) as 'metadata' | 'content'
        }));
      } 

      console.log("records", this.records)
      
      this.filteredRecords = [...this.records];
    } catch (error) {
      console.error('Error loading records:', error);
    }

    this.loading = false;
    this.render();
  }


  private determineRecordType(key: string): 'metadata' | 'content' {
    const contentKeys = ['ipfs-root', 'content-hash', 'data-uri', 'ipfs', 'hash'];
    return contentKeys.some(ck => key.toLowerCase().includes(ck)) ? 'content' : 'metadata';
  }

  private filterRecords() {
    this.filteredRecords = this.records.filter(record =>
      record.key.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      record.value.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.updateRecordsList();
  }

  private async addRecord(key: string, value: string) {
    if (!key.trim() || !value.trim()) {
      this.showNotification('Key and value cannot be empty', 'error');
      return;
    }

    if (this.records.some(r => r.key === key)) {
      this.showNotification('Key already exists', 'error');
      return;
    }

    try {
      if (this.safeIntegration.isConnected()) {
        await this.safeIntegration.setRecord(key, value);
        this.showNotification('Record added successfully! Transaction pending approval.', 'success');
      } else {
        console.log('Mock: Would execute Safe transaction for setRecord');
      }

      // Optimistically update UI
      const newRecord: S2SRecord = { 
        key, 
        value, 
        type: this.determineRecordType(key) as 'metadata' | 'content' 
      };
      this.records.push(newRecord);
      this.filterRecords();
      
    } catch (error) {
      console.error('Error adding record:', error);
      this.showNotification('Failed to add record. Please try again.', 'error');
    }
  }

  private async updateRecord(key: string, newValue: string) {
    const recordIndex = this.records.findIndex(r => r.key === key);
    if (recordIndex === -1) return;

    try {
      if (this.safeIntegration.isConnected()) {
        await this.safeIntegration.setRecord(key, newValue);
        this.showNotification('Record updated successfully! Transaction pending approval.', 'success');
      } else {
        console.log('Mock: Would execute Safe transaction for updateRecord');
      }

      // Optimistically update UI
      this.records[recordIndex].value = newValue;
      this.filterRecords();
      
    } catch (error) {
      console.error('Error updating record:', error);
      this.showNotification('Failed to update record. Please try again.', 'error');
    }
  }

  private async deleteRecord(key: string) {
    const recordIndex = this.records.findIndex(r => r.key === key);
    if (recordIndex === -1) return;

    try {
      if (this.safeIntegration.isConnected()) {
        await this.safeIntegration.deleteRecord(key);
        this.showNotification('Record deleted successfully! Transaction pending approval.', 'success');
      } else {
        console.log('Mock: Would execute Safe transaction for deleteRecord');
      }

      // Optimistically update UI
      this.records.splice(recordIndex, 1);
      this.filterRecords();
      
    } catch (error) {
      console.error('Error deleting record:', error);
      this.showNotification('Failed to delete record. Please try again.', 'error');
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      max-width: 400px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
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
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        
        .header {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }
        
        .title-section {
          flex: 1;
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
        }
        
        .status-connected {
          background: #dcfce7;
          color: #166534;
        }
        
        .status-mock {
          background: #fef3c7;
          color: #92400e;
        }
        
        .addresses {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: right;
        }
        
        .address-label {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .address-value {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background: #f3f4f6;
          padding: 0.5rem;
          border-radius: 0.375rem;
          margin-bottom: 0.75rem;
          word-break: break-all;
          border: 1px solid #e5e7eb;
        }
        
        .search-section {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        
        .search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          margin-bottom: 2rem;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .add-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 2rem;
        }
        
        .add-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #111827;
        }
        
        .add-form {
          display: grid;
          grid-template-columns: 1fr 2fr auto;
          gap: 1rem;
          align-items: end;
        }
        
        @media (max-width: 768px) {
          .add-form {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .header {
            flex-direction: column;
            align-items: stretch;
            text-align: left;
          }
          
          .addresses {
            text-align: left;
          }
        }
        
        .input {
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: background-color 0.2s, transform 0.1s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .button:active {
          transform: translateY(0);
        }
        
        .button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        
        .records-section {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .records-header {
          padding: 2rem;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(to right, #f8fafc, #f1f5f9);
        }
        
        .records-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .record-count {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
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
        
        .loading-text {
          color: #6b7280;
          font-size: 1.125rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6b7280;
        }
        
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .empty-title {
          font-size: 1.25rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        .empty-description {
          font-size: 0.875rem;
          opacity: 0.8;
        }
        
        .footer {
          margin-top: 3rem;
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          padding: 2rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .footer p {
          margin: 0.5rem 0;
        }
      </style>
      
      ${this.loading ? `
        <div class="loading">
          <div class="spinner"></div>
          <p class="loading-text">Loading S2S Records...</p>
        </div>
      ` : `
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="title-section">
              <h1 class="title">
                📄 Soul2Soul Records
              </h1>
              <p class="subtitle">Manage publication records stored in your Safe module</p>
              <div class="safe-status ${this.safeIntegration.isConnected() ? 'status-connected' : 'status-mock'}">
                ${this.safeIntegration.isConnected() ? '🟢 Connected to Safe' : '🟡 Running in mock mode'}
              </div>
            </div>
            <div class="addresses">
              <div class="address-label">Safe Address</div>
              <div class="address-value">${this.safeInfo.safeAddress}</div>
              <div class="address-label">Module Address</div>
              <div class="address-value">${this.safeInfo.s2sRecords}</div>
            </div>
          </div>
          
          <!-- Search and Add -->
          <div class="search-section">
            <input 
              type="text" 
              class="search-input" 
              placeholder="🔍 Search records by key or value..." 
              id="search-input"
            />
            
            <div class="add-section">
              <h3 class="add-title">➕ Add New Record</h3>
              <div class="add-form">
                <input 
                  type="text" 
                  class="input" 
                  placeholder="Key (e.g., title, author, ipfs-hash)" 
                  id="new-key" 
                />
                <input 
                  type="text" 
                  class="input" 
                  placeholder="Value" 
                  id="new-value" 
                />
                <button class="button" id="add-btn">
                  ➕ Add Record
                </button>
              </div>
            </div>
          </div>
          
          <!-- Records -->
          <div class="records-section">
            <div class="records-header">
              <h2 class="records-title">
                📋 Records 
                <span class="record-count">${this.filteredRecords.length}</span>
              </h2>
            </div>
            <div id="records-container"></div>
          </div>
        
        </div>
      `}
    `;

    if (!this.loading) {
      this.attachEventListeners();
      this.updateRecordsList();
    }
  }

  private attachEventListeners() {
    const searchInput = this.shadowRoot?.querySelector('#search-input') as HTMLInputElement;
    const addBtn = this.shadowRoot?.querySelector('#add-btn') as HTMLButtonElement;
    const newKeyInput = this.shadowRoot?.querySelector('#new-key') as HTMLInputElement;
    const newValueInput = this.shadowRoot?.querySelector('#new-value') as HTMLInputElement;

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = (e.target as HTMLInputElement).value;
        this.filterRecords();
      });
    }

    if (addBtn && newKeyInput && newValueInput) {
      const handleAdd = () => {
        const key = newKeyInput.value.trim();
        const value = newValueInput.value.trim();
        
        if (key && value) {
          addBtn.disabled = true;
          this.addRecord(key, value).finally(() => {
            addBtn.disabled = false;
            newKeyInput.value = '';
            newValueInput.value = '';
          });
        }
      };

      addBtn.addEventListener('click', handleAdd);
      
      // Allow Enter key to add record
      [newKeyInput, newValueInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleAdd();
          }
        });
      });
    }

    // Listen for custom events from record items
    this.addEventListener('edit-record', ((e: EditRecordEvent) => {
      this.editingKey = e.detail.key;
      this.updateRecordsList();
    }) as EventListener);

    this.addEventListener('save-record', ((e: SaveRecordEvent) => {
      this.updateRecord(e.detail.key, e.detail.value).then(() => {
        this.editingKey = null;
        this.updateRecordsList();
      });
    }) as EventListener);

    this.addEventListener('cancel-edit', (() => {
      this.editingKey = null;
      this.updateRecordsList();
    }) as EventListener);

    this.addEventListener('delete-record', ((e: CustomEvent) => {
      this.deleteRecord(e.detail.key);
    }) as EventListener);
  }

  private updateRecordsList() {
    const recordsContainer = this.shadowRoot?.querySelector('#records-container');
    if (!recordsContainer) return;

    if (this.filteredRecords.length === 0) {
      recordsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <div class="empty-title">No records found</div>
          <div class="empty-description">
            ${this.searchTerm ? 'Try adjusting your search term or clear the search to see all records.' : 'Add your first record using the form above.'}
          </div>
        </div>
      `;
      return;
    }

    console.log("ready to display records", this.filteredRecords, recordsContainer)

    recordsContainer.innerHTML = this.filteredRecords.map(record => `
      <s2s-record-item 
        data-key="${record.key}"
        data-value="${record.value}"
        data-type="${record.type}"
        ${this.editingKey === record.key ? 'data-editing="true"' : ''}
      ></s2s-record-item>
    `).join('');
  }
}

// Register the custom element

customElements.define('s2s-records-app', S2SRecordsApp);