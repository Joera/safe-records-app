// s2s-deals-tab.ts
import { SafeIntegration } from '../lib/safe-integration.js';

export class S2SDealsTab extends HTMLElement {
  public safeIntegration!: SafeIntegration;
  private loading = true;
  private deals: Array<{streamId: string, author: string, status: 'active' | 'pending'}> = [];
  private pendingDeals: Array<{streamId: string, author: string, publication: string}> = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    console.log('Deals tab connected');
    await this.loadDeals();
    this.render();
  }

  private async loadDeals() {
    this.loading = true;
    this.render();

    try {
      // TODO: We need to add methods to fetch all deals
      // For now, this is a placeholder structure
      // You'll need to add event listening or storage to track deals
      
      this.deals = [];
      this.pendingDeals = [];
      
    } catch (error) {
      console.error('Error loading deals:', error);
    }

    this.loading = false;
    this.render();
  }

  private async checkDeal(streamId: string) {
    try {
      const hasDeal = await this.safeIntegration.hasDeal(streamId);
      const author = hasDeal ? await this.safeIntegration.getDealAuthor(streamId) : '';
      
      this.showNotification(
        hasDeal 
          ? `✅ Deal exists for ${streamId} (Author: ${author})`
          : `❌ No deal found for ${streamId}`,
        hasDeal ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Error checking deal:', error);
      this.showNotification('Failed to check deal', 'error');
    }
  }

  private async offerDeal(publication: string, streamId: string) {
    if (!publication.trim() || !streamId.trim()) {
      this.showNotification('Publication and Stream ID cannot be empty', 'error');
      return;
    }

    try {
      await this.safeIntegration.offerDeal(publication, streamId);
      this.showNotification('Deal offered successfully! Transaction pending approval.', 'success');
      
      // Optimistically add to pending deals
      this.pendingDeals.push({ streamId, author: 'You', publication });
      this.render();
    } catch (error) {
      console.error('Error offering deal:', error);
      this.showNotification('Failed to offer deal. Please try again.', 'error');
    }
  }

  private async acceptDeal(streamId: string) {
    try {
      await this.safeIntegration.acceptDeal(streamId);
      this.showNotification('Deal accepted! Transaction pending approval.', 'success');
      
      // Move from pending to active
      const dealIndex = this.pendingDeals.findIndex(d => d.streamId === streamId);
      if (dealIndex !== -1) {
        const deal = this.pendingDeals[dealIndex];
        this.deals.push({ streamId: deal.streamId, author: deal.author, status: 'active' });
        this.pendingDeals.splice(dealIndex, 1);
        this.render();
      }
    } catch (error) {
      console.error('Error accepting deal:', error);
      this.showNotification('Failed to accept deal. Please try again.', 'error');
    }
  }

  private async revokeDeal(streamId: string) {
    if (!confirm(`Are you sure you want to revoke the deal for ${streamId}?`)) {
      return;
    }

    try {
      await this.safeIntegration.revokeDeal(streamId);
      this.showNotification('Deal revoked! Transaction pending approval.', 'success');
      
      // Remove from deals list
      this.deals = this.deals.filter(d => d.streamId !== streamId);
      this.render();
    } catch (error) {
      console.error('Error revoking deal:', error);
      this.showNotification('Failed to revoke deal. Please try again.', 'error');
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    const event = new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);

    // Also show inline notification
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
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 2rem;
        }

        .section {
          margin-bottom: 3rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .check-deal-form,
        .offer-deal-form {
          display: grid;
          gap: 1rem;
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .offer-deal-form {
          grid-template-columns: 1fr 2fr auto;
        }

        .check-deal-form {
          grid-template-columns: 1fr auto;
        }

        @media (max-width: 768px) {
          .offer-deal-form,
          .check-deal-form {
            grid-template-columns: 1fr;
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
          white-space: nowrap;
        }

        .button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .button:active {
          transform: translateY(0);
        }

        .button-secondary {
          background: #6b7280;
        }

        .button-secondary:hover {
          background: #4b5563;
        }

        .button-danger {
          background: #ef4444;
        }

        .button-danger:hover {
          background: #dc2626;
        }

        .deals-list {
          display: grid;
          gap: 1rem;
        }

        .deal-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .deal-info {
          flex: 1;
        }

        .deal-stream-id {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.875rem;
          color: #111827;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .deal-author {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .deal-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 0.5rem;
        }

        .status-active {
          background: #dcfce7;
          color: #166534;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .deal-actions {
          display: flex;
          gap: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }
      </style>

      ${this.loading ? `
        <div class="loading">
          <p>Loading deals...</p>
        </div>
      ` : `
        <!-- Check Deal -->
        <div class="section">
          <h2 class="section-title">🔍 Check Deal Status</h2>
          <p class="section-description">Check if a deal exists for a specific stream ID</p>
          
          <div class="check-deal-form">
            <input 
              type="text" 
              class="input" 
              placeholder="Stream ID (e.g., ceramic://...)"
              id="check-stream-id"
            />
            <button class="button" id="check-deal-btn">
              Check Deal
            </button>
          </div>
        </div>

        <!-- Offer Deal -->
        <div class="section">
          <h2 class="section-title">➕ Offer New Deal</h2>
          <p class="section-description">Propose a new deal with an author</p>
          
          <div class="offer-deal-form">
            <input 
              type="text" 
              class="input" 
              placeholder="Publication Address (0x...)"
              id="offer-publication"
            />
            <input 
              type="text" 
              class="input" 
              placeholder="Stream ID (e.g., ceramic://...)"
              id="offer-stream-id"
            />
            <button class="button" id="offer-deal-btn">
              Offer Deal
            </button>
          </div>
        </div>

        <!-- Pending Deals -->
        ${this.pendingDeals.length > 0 ? `
          <div class="section">
            <h2 class="section-title">⏳ Pending Deals</h2>
            <div class="deals-list">
              ${this.pendingDeals.map(deal => `
                <div class="deal-card">
                  <div class="deal-info">
                    <div class="deal-stream-id">${deal.streamId}</div>
                    <div class="deal-author">Author: ${deal.author}</div>
                    <div class="deal-author">Publication: ${deal.publication}</div>
                    <span class="deal-status status-pending">⏳ Pending</span>
                  </div>
                  <div class="deal-actions">
                    <button 
                      class="button button-secondary" 
                      data-action="accept"
                      data-stream-id="${deal.streamId}"
                    >
                      ✓ Accept
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Active Deals -->
        <div class="section">
          <h2 class="section-title">✅ Active Deals</h2>
          ${this.deals.length > 0 ? `
            <div class="deals-list">
              ${this.deals.map(deal => `
                <div class="deal-card">
                  <div class="deal-info">
                    <div class="deal-stream-id">${deal.streamId}</div>
                    <div class="deal-author">Author: ${deal.author}</div>
                    <span class="deal-status status-active">✓ Active</span>
                  </div>
                  <div class="deal-actions">
                    <button 
                      class="button button-danger" 
                      data-action="revoke"
                      data-stream-id="${deal.streamId}"
                    >
                      ✗ Revoke
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-icon">📄</div>
              <p>No active deals yet</p>
            </div>
          `}
        </div>
      `}
    `;

    if (!this.loading) {
      this.attachEventListeners();
    }
  }

  private attachEventListeners() {
    // Check deal
    const checkBtn = this.shadowRoot?.querySelector('#check-deal-btn');
    const checkInput = this.shadowRoot?.querySelector('#check-stream-id') as HTMLInputElement;
    
    checkBtn?.addEventListener('click', () => {
      const streamId = checkInput?.value.trim();
      if (streamId) {
        this.checkDeal(streamId);
      }
    });

    // Offer deal
    const offerBtn = this.shadowRoot?.querySelector('#offer-deal-btn');
    const offerPubInput = this.shadowRoot?.querySelector('#offer-publication') as HTMLInputElement;
    const offerStreamInput = this.shadowRoot?.querySelector('#offer-stream-id') as HTMLInputElement;
    
    offerBtn?.addEventListener('click', () => {
      const publication = offerPubInput?.value.trim();
      const streamId = offerStreamInput?.value.trim();
      if (publication && streamId) {
        this.offerDeal(publication, streamId).then(() => {
          offerPubInput.value = '';
          offerStreamInput.value = '';
        });
      }
    });

    // Deal actions (accept/revoke)
    this.shadowRoot?.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const action = target.dataset.action;
        const streamId = target.dataset.streamId;
        
        if (!streamId) return;
        
        if (action === 'accept') {
          this.acceptDeal(streamId);
        } else if (action === 'revoke') {
          this.revokeDeal(streamId);
        }
      });
    });
  }
}

customElements.define('s2s-deals-tab', S2SDealsTab);