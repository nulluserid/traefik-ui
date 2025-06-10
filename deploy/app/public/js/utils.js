/**
 * Traefik UI - Shared Utilities Module
 * Common functions and helpers used across all modules
 * Version: 0.6.3
 */

class TraefikUtils {
    
    /**
     * API Request Helper with standardized error handling
     */
    static async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            this.showNotification(`API Error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Enhanced notification system with stacking and history
     */
    static notificationHistory = [];
    static notificationCounter = 0;

    static showNotification(message, type = 'info', duration = 5000) {
        const timestamp = new Date();
        const notificationId = ++this.notificationCounter;
        
        // Add to history
        this.notificationHistory.unshift({
            id: notificationId,
            message,
            type,
            timestamp,
            read: false
        });
        
        // Keep only last 100 notifications in history
        if (this.notificationHistory.length > 100) {
            this.notificationHistory = this.notificationHistory.slice(0, 100);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = notificationId;
        
        // Build notification content
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-message">${this.sanitizeHTML(message)}</div>
                <div class="notification-time">${timestamp.toLocaleTimeString()}</div>
                <button class="notification-close" onclick="TraefikUtils.dismissNotification(${notificationId})">&times;</button>
            </div>
        `;
        
        const container = this.getNotificationContainer();
        
        // Add notification to the top of the stack
        if (container.firstChild) {
            container.insertBefore(notification, container.firstChild);
        } else {
            container.appendChild(notification);
        }
        
        // Animate in
        setTimeout(() => notification.classList.add('notification-show'), 10);
        
        // Auto-remove notification if duration > 0
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notificationId);
            }, duration);
        }
        
        // Update notification count in header
        this.updateNotificationCount();
        
        return notification;
    }

    static dismissNotification(notificationId) {
        const notification = document.querySelector(`[data-id="${notificationId}"]`);
        if (notification) {
            notification.classList.add('notification-hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
        
        // Mark as read in history
        const historyItem = this.notificationHistory.find(n => n.id === notificationId);
        if (historyItem) {
            historyItem.read = true;
        }
        
        this.updateNotificationCount();
    }

    static dismissAllNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            const id = parseInt(notification.dataset.id);
            this.dismissNotification(id);
        });
    }

    static getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    static getNotificationContainer() {
        let container = document.getElementById('notifications');
        if (!container) {
            container = this.createNotificationContainer();
        }
        return container;
    }

    /**
     * Create notification container with improved styling
     */
    static createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        
        // Add notification controls to header if not exists
        this.addNotificationControls();
        
        return container;
    }

    static addNotificationControls() {
        const header = document.querySelector('header .header-controls');
        if (header && !header.querySelector('.notification-controls')) {
            const notificationControls = document.createElement('div');
            notificationControls.className = 'notification-controls';
            notificationControls.innerHTML = `
                <button id="notification-toggle" class="btn btn-secondary" title="View notifications">
                    🔔 <span id="notification-count" class="notification-badge">0</span>
                </button>
                <button id="clear-notifications" class="btn btn-secondary" title="Clear all notifications">🗑️</button>
            `;
            
            header.appendChild(notificationControls);
            
            // Add event listeners
            document.getElementById('notification-toggle').addEventListener('click', () => {
                this.toggleNotificationHistory();
            });
            
            document.getElementById('clear-notifications').addEventListener('click', () => {
                this.dismissAllNotifications();
            });
        }
    }

    static updateNotificationCount() {
        const unreadCount = this.notificationHistory.filter(n => !n.read).length;
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline' : 'none';
        }
    }

    static toggleNotificationHistory() {
        let historyModal = document.getElementById('notification-history-modal');
        
        if (historyModal) {
            historyModal.remove();
            return;
        }
        
        historyModal = document.createElement('div');
        historyModal.id = 'notification-history-modal';
        historyModal.className = 'modal notification-history-modal';
        historyModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📬 Notification History</h3>
                    <button class="close-btn" onclick="document.getElementById('notification-history-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="notification-history-controls">
                        <button class="btn btn-secondary btn-sm" onclick="TraefikUtils.clearNotificationHistory()">Clear History</button>
                        <button class="btn btn-secondary btn-sm" onclick="TraefikUtils.markAllNotificationsRead()">Mark All Read</button>
                    </div>
                    <div id="notification-history-list" class="notification-history-list">
                        ${this.buildNotificationHistoryHTML()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(historyModal);
        historyModal.style.display = 'block';
        
        // Mark all as read when viewing history
        setTimeout(() => this.markAllNotificationsRead(), 1000);
        
        // Close on backdrop click
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                historyModal.remove();
            }
        });
    }

    static buildNotificationHistoryHTML() {
        if (this.notificationHistory.length === 0) {
            return '<p class="no-notifications">No notifications yet</p>';
        }
        
        return this.notificationHistory.map(notification => {
            const timeAgo = this.getTimeAgo(notification.timestamp);
            const readClass = notification.read ? 'read' : 'unread';
            
            return `
                <div class="notification-history-item ${readClass}">
                    <div class="notification-history-icon">${this.getNotificationIcon(notification.type)}</div>
                    <div class="notification-history-content">
                        <div class="notification-history-message">${this.sanitizeHTML(notification.message)}</div>
                        <div class="notification-history-meta">
                            <span class="notification-history-type">${notification.type.toUpperCase()}</span>
                            <span class="notification-history-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    static clearNotificationHistory() {
        this.notificationHistory = [];
        this.updateNotificationCount();
        
        const historyList = document.getElementById('notification-history-list');
        if (historyList) {
            historyList.innerHTML = '<p class="no-notifications">No notifications yet</p>';
        }
        
        this.showNotification('Notification history cleared', 'info');
    }

    static markAllNotificationsRead() {
        this.notificationHistory.forEach(notification => {
            notification.read = true;
        });
        this.updateNotificationCount();
        
        // Update visual state in history
        const historyItems = document.querySelectorAll('.notification-history-item.unread');
        historyItems.forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
        });
    }

    /**
     * DOM Element Helper - Find element by ID with error handling
     */
    static getElement(id, required = true) {
        const element = document.getElementById(id);
        if (!element && required) {
            console.error(`Required element not found: #${id}`);
        }
        return element;
    }

    /**
     * Form Data Helper - Extract form data as object
     * Works with both name attributes and ID-based elements
     */
    static getFormData(formElement) {
        const data = {};
        
        // First try standard FormData approach (for elements with name attributes)
        const formData = new FormData(formElement);
        for (let [key, value] of formData.entries()) {
            // Handle checkboxes and multiple values
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        // Also extract data by ID for elements without name attributes
        const elements = formElement.querySelectorAll('input, select, textarea');
        elements.forEach(element => {
            if (element.id && !data[element.id]) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    data[element.id] = element.checked ? (element.value || 'on') : undefined;
                } else if (element.type === 'file') {
                    data[element.id] = element.files;
                } else if (element.tagName === 'SELECT' && element.multiple) {
                    data[element.id] = Array.from(element.selectedOptions).map(opt => opt.value);
                } else {
                    data[element.id] = element.value;
                }
            }
        });
        
        // Clean up undefined values
        Object.keys(data).forEach(key => {
            if (data[key] === undefined || data[key] === '') {
                delete data[key];
            }
        });
        
        return data;
    }

    /**
     * Clipboard Helper
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    /**
     * Validation Helpers
     */
    static validateDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]*\.?[a-zA-Z0-9]*[a-zA-Z0-9-_]*[[a-zA-Z0-9]*$/;
        return domainRegex.test(domain);
    }

    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static validatePort(port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
    }

    /**
     * Debounce Helper for search/filter inputs
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Format bytes for display
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format timestamp for display
     */
    static formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    /**
     * Generate unique ID for UI elements
     */
    static generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Local Storage Helpers
     */
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Status Badge Helper
     */
    static createStatusBadge(status, text = null) {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${status}`;
        badge.textContent = text || status.toUpperCase();
        return badge;
    }

    /**
     * Loading Spinner Helper
     */
    static showLoadingSpinner(container, message = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        container.appendChild(spinner);
        return spinner;
    }

    static hideLoadingSpinner(container) {
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Deep clone object (simple version)
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

// Make available globally
window.TraefikUtils = TraefikUtils;