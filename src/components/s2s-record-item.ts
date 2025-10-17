// src/components/s2s-record-item.ts
import { EditRecordEvent, SaveRecordEvent, CancelEditEvent } from '../types/index.js';
import { truncateValue } from '../utils/index.js';

export class S2SRecordItem extends HTMLElement {
  private isEditing = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.isEditing = this.hasAttribute('data-editing');
    this.render();
  }

  static get observedAttributes() {
    return ['data-editing', 'data-key', 'data-value', 'data-type'];
  }

  attributeChangedCallback() {
    this.isEditing = this.hasAttribute('data-editing');
    this.render();
  }

  private getTypeColor(type: string): string {
    switch (type) {
      case 'metadata': return '#dbeafe';
      case 'content': return '#dcfce7';
      default: return '#f3f4f6';
    }
  }

  private getTypeTextColor(type: string): string {
    switch (type) {
      case 'metadata': return '#1e40af';
      case 'content': return '#166534';
      default: return '#374151';
    }
  }

  private render() {
    if (!this.shadowRoot) return;

    const key = this.getAttribute('data-key') || '';
    const value = this.getAttribute('data-value') || '';
    const type = this.getAttribute('data-type') || 'metadata';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        
        :host(:hover) {
          background-color: var(--hover-bg, #f9fafb);
        }
        
        :host(:last-child) {
          border-bottom: none;
        }
        
        .record-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .record-content {
          flex: 1;
          min-width: 0;
        }
        
        .record-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
        
        .record-key {
          font-weight: 600;
          font-size: 1.125rem;
          color: var(--text-primary, #111827);
          margin: 0;
          word-break: break-word;
        }
        
        .record-type {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          background: ${this.getTypeColor(type)};
          color: ${this.getTypeTextColor(type)};
          white-space: nowrap;
        }
        
        .record-value {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          background: var(--code-bg, #f3f4f6);
          padding: 0.75rem;
          border-radius: 0.375rem;
          color: var(--text-secondary, #374151);
          word-break: break-all;
          line-height: 1.5;
          border: 1px solid var(--border-color, #e5e7eb);
        }
        
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .label {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--text-secondary, #374151);
        }
        
        .input {
          padding: 0.75rem;
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 0.375rem;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .input:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
          box-shadow: 0 0 0 3px var(--primary-shadow, rgba(59, 130, 246, 0.1));
        }
        
        .input-value {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          min-height: 60px;
          resize: vertical;
        }
        
        .button {
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .button:hover {
          transform: translateY(-1px);
        }
        
        .button:active {
          transform: translateY(0);
        }
        
        .button-save {
          background: var(--success-color, #10b981);
          color: white;
          margin-right: 0.5rem;
        }
        
        .button-save:hover {
          background: var(--success-hover, #059669);
        }
        
        .button-cancel {
          background: var(--neutral-color, #6b7280);
          color: white;
        }
        
        .button-cancel:hover {
          background: var(--neutral-hover, #4b5563);
        }
        
        .button-edit {
          background: var(--button-bg, #f3f4f6);
          color: var(--primary-color, #3b82f6);
          border: 1px solid var(--border-color, #e5e7eb);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        
        .button-edit:hover {
          background: var(--button-hover-bg, #e5e7eb);
          color: var(--primary-hover, #1d4ed8);
        }
        
        .button-delete {
          background: var(--error-bg, #fef2f2);
          color: var(--error-color, #dc2626);
          border: 1px solid var(--error-border, #fecaca);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          margin-left: 0.5rem;
        }
        
        .button-delete:hover {
          background: var(--error-hover-bg, #fee2e2);
          color: var(--error-hover, #b91c1c);
        }
        
        .actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
        }
        
        @media (max-width: 640px) {
          :host {
            padding: 1rem;
          }
          
          .record-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .actions {
            justify-content: flex-end;
            margin-top: 1rem;
          }
          
          .edit-form {
            gap: 0.75rem;
          }
        }
      </style>
      
      ${this.isEditing ? this.renderEditMode(key, value) : this.renderViewMode(key, value, type)}
    `;

    this.attachEventListeners();
  }

  private renderEditMode(key: string, value: string): string {
    return `
      <div>
        <div class="edit-form">
          <div class="input-group">
            <label class="label">Key</label>
            <input type="text" class="input" value="${key}" id="edit-key" readonly />
          </div>
          <div class="input-group">
            <label class="label">Value</label>
            <textarea class="input input-value" id="edit-value" placeholder="Enter value...">${value}</textarea>
          </div>
        </div>
        <div class="button-group">
          <button class="button button-save" id="save-btn">
            💾 Save Changes
          </button>
          <button class="button button-cancel" id="cancel-btn">
            ❌ Cancel
          </button>
        </div>
      </div>
    `;
  }

  private renderViewMode(key: string, value: string, type: string): string {
    return `
      <div class="record-container">
        <div class="record-content">
          <div class="record-header">
            <h3 class="record-key">${key}</h3>
            <span class="record-type">${type}</span>
          </div>
          <div class="record-value" title="${value}">${truncateValue(value, 100)}</div>
        </div>
        <div class="actions">
          <button class="button button-edit" id="edit-btn">
            ✏️ Edit
          </button>
          <button class="button button-delete" id="delete-btn">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    const editBtn = this.shadowRoot?.querySelector('#edit-btn');
    const saveBtn = this.shadowRoot?.querySelector('#save-btn');
    const cancelBtn = this.shadowRoot?.querySelector('#cancel-btn');
    const deleteBtn = this.shadowRoot?.querySelector('#delete-btn');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('edit-record', {
          detail: { key: this.getAttribute('data-key') },
          bubbles: true
        }) as EditRecordEvent);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const valueInput = this.shadowRoot?.querySelector('#edit-value') as HTMLTextAreaElement;
        
        this.dispatchEvent(new CustomEvent('save-record', {
          detail: { 
            key: this.getAttribute('data-key') || '',
            value: valueInput?.value || ''
          },
          bubbles: true
        }) as SaveRecordEvent);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('cancel-edit', {
          bubbles: true
        }) as CancelEditEvent);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const key = this.getAttribute('data-key');
        // if (confirm(`Are you sure you want to delete the record "${key}"?`)) {
          this.dispatchEvent(new CustomEvent('delete-record', {
            detail: { key },
            bubbles: true
          }));
        }
      // });
    }
  }
}

// Register the custom element
customElements.define('s2s-record-item', S2SRecordItem);