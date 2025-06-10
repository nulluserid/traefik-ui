/**
 * Traefik UI - UI Components Module
 * Reusable UI components and modal management
 * Version: 0.6.5
 */

class TraefikUIComponents {

    /**
     * Modal Management System
     */
    static showModal(modalId) {
        const modal = TraefikUtils.getElement(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    }

    static hideModal(modalId) {
        const modal = TraefikUtils.getElement(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    static hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
    }

    /**
     * Dynamic Table Builder
     */
    static createTable(headers, data, options = {}) {
        const table = document.createElement('table');
        table.className = options.className || 'data-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.label || header;
            if (header.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => this.sortTable(table, header.key));
            }
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        this.populateTableBody(tbody, headers, data, options);
        table.appendChild(tbody);

        return table;
    }

    static populateTableBody(tbody, headers, data, options = {}) {
        tbody.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            headers.forEach(header => {
                const td = document.createElement('td');
                const key = header.key || header;
                let value = item[key];
                
                // Handle special formatting
                if (header.formatter) {
                    value = header.formatter(value, item);
                } else if (header.type === 'status') {
                    td.appendChild(TraefikUtils.createStatusBadge(value));
                    return;
                } else if (header.type === 'actions') {
                    this.createActionButtons(td, item, header.actions || []);
                    return;
                }
                
                td.textContent = value || '';
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
    }

    /**
     * Action Button Creator
     */
    static createActionButtons(container, item, actions) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'action-buttons';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `btn btn-sm btn-${action.type || 'secondary'}`;
            button.textContent = action.label;
            button.title = action.title || action.label;
            
            if (action.condition && !action.condition(item)) {
                button.disabled = true;
            }
            
            button.addEventListener('click', () => action.handler(item));
            buttonGroup.appendChild(button);
        });
        
        container.appendChild(buttonGroup);
    }

    /**
     * Filter System
     */
    static createFilterDropdown(options, onFilterChange, defaultValue = 'all') {
        const select = document.createElement('select');
        select.className = 'filter-select';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (option.value === defaultValue) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        });
        
        select.addEventListener('change', (e) => onFilterChange(e.target.value));
        return select;
    }

    static filterTableRows(table, filterFn) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const index = parseInt(row.dataset.index);
            row.style.display = filterFn(index, row) ? '' : 'none';
        });
    }

    /**
     * Form Builder Helpers
     */
    static createFormGroup(label, input, options = {}) {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        if (options.inline) {
            group.classList.add('form-group-inline');
        }
        
        if (label) {
            const labelElement = document.createElement('label');
            labelElement.textContent = label;
            if (input.id) {
                labelElement.setAttribute('for', input.id);
            }
            group.appendChild(labelElement);
        }
        
        group.appendChild(input);
        
        if (options.help) {
            const help = document.createElement('small');
            help.className = 'form-help';
            help.textContent = options.help;
            group.appendChild(help);
        }
        
        return group;
    }

    static createInput(type, options = {}) {
        const input = document.createElement('input');
        input.type = type;
        
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'className') {
                input.className = value;
            } else {
                input.setAttribute(key, value);
            }
        });
        
        return input;
    }

    static createSelect(options, selectedValue = null) {
        const select = document.createElement('select');
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (option.value === selectedValue) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        });
        
        return select;
    }

    /**
     * Progress and Status Indicators
     */
    static createProgressBar(value, max = 100, options = {}) {
        const container = document.createElement('div');
        container.className = 'progress-bar-container';
        
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        fill.style.width = `${(value / max) * 100}%`;
        
        if (options.color) {
            fill.style.backgroundColor = options.color;
        }
        
        bar.appendChild(fill);
        container.appendChild(bar);
        
        if (options.showText) {
            const text = document.createElement('span');
            text.className = 'progress-text';
            text.textContent = `${value}/${max}`;
            container.appendChild(text);
        }
        
        return container;
    }

    /**
     * Tab System Helpers
     */
    static initializeTabs(tabContainer, contentContainer) {
        const tabs = tabContainer.querySelectorAll('.tab-btn');
        const contents = contentContainer.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tab states
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update content visibility
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    /**
     * Card Component Creator
     */
    static createCard(title, content, options = {}) {
        const card = document.createElement('div');
        card.className = `card ${options.className || ''}`;
        
        if (title) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `<h3>${title}</h3>`;
            card.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.className = 'card-body';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }
        
        card.appendChild(body);
        
        if (options.actions) {
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            options.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `btn btn-${action.type || 'secondary'}`;
                button.textContent = action.label;
                button.addEventListener('click', action.handler);
                footer.appendChild(button);
            });
            card.appendChild(footer);
        }
        
        return card;
    }

    /**
     * Confirmation Dialog
     */
    static showConfirmDialog(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal confirmation-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${TraefikUtils.sanitizeHTML(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${TraefikUtils.sanitizeHTML(message)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">Cancel</button>
                        <button class="btn btn-danger confirm-btn">Confirm</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            const cleanup = () => {
                modal.remove();
                document.body.classList.remove('modal-open');
            };
            
            modal.querySelector('.cancel-btn').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            modal.querySelector('.confirm-btn').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    /**
     * Tooltip System
     */
    static addTooltip(element, text, position = 'top') {
        element.setAttribute('data-tooltip', text);
        element.setAttribute('data-tooltip-position', position);
        element.classList.add('has-tooltip');
    }

    /**
     * Collapsible Section Creator
     */
    static createCollapsibleSection(title, content, expanded = false) {
        const section = document.createElement('div');
        section.className = 'collapsible-section';
        
        const header = document.createElement('div');
        header.className = 'collapsible-header';
        header.innerHTML = `
            <span class="collapsible-title">${title}</span>
            <span class="collapsible-toggle">${expanded ? '−' : '+'}</span>
        `;
        
        const body = document.createElement('div');
        body.className = 'collapsible-body';
        body.style.display = expanded ? 'block' : 'none';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }
        
        header.addEventListener('click', () => {
            const isExpanded = body.style.display === 'block';
            body.style.display = isExpanded ? 'none' : 'block';
            header.querySelector('.collapsible-toggle').textContent = isExpanded ? '+' : '−';
        });
        
        section.appendChild(header);
        section.appendChild(body);
        
        return section;
    }
}

// Make available globally
window.TraefikUIComponents = TraefikUIComponents;