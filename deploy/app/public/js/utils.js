/**
 * Traefik UI - Shared Utilities Module
 * Common functions and helpers used across all modules
 * Version: 0.0.6
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
     * Standardized notification system
     */
    static showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notifications') || this.createNotificationContainer();
        container.appendChild(notification);
        
        // Auto-remove notification
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
        
        return notification;
    }

    /**
     * Create notification container if it doesn't exist
     */
    static createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
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
     */
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
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