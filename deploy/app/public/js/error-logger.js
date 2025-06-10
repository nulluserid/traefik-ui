/**
 * Traefik UI - Error Logger Module
 * Comprehensive client-side error logging with external storage
 * Version: 0.6.6
 */

class TraefikErrorLogger {
    
    constructor() {
        this.errorQueue = [];
        this.isOnline = navigator.onLine;
        this.setupGlobalErrorHandlers();
        this.setupNetworkMonitoring();
        this.startPeriodicSync();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Catch all JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'promise_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        });

        // Override console.error to capture manual error logs
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
            this.logError({
                type: 'console_error',
                message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        };
    }

    /**
     * Setup network connectivity monitoring
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncErrorsToServer();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Log an error with context information
     */
    logError(errorData) {
        const enrichedError = {
            ...errorData,
            sessionId: this.getSessionId(),
            currentTab: this.getCurrentTab(),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            localStorage: this.getRelevantLocalStorage(),
            networkStatus: this.isOnline ? 'online' : 'offline',
            performanceMetrics: this.getPerformanceMetrics()
        };

        // Add to queue
        this.errorQueue.push(enrichedError);

        // Store in localStorage for persistence
        this.storeErrorInLocalStorage(enrichedError);

        // Try to send immediately if online
        if (this.isOnline) {
            this.syncErrorsToServer();
        }

        // Also show in console for immediate debugging
        console.warn('🚨 Error logged:', enrichedError);
    }

    /**
     * Log API request errors with additional context
     */
    logAPIError(endpoint, method, status, responseText, requestData = null) {
        this.logError({
            type: 'api_error',
            message: `API ${method} ${endpoint} failed with status ${status}`,
            endpoint,
            method,
            status,
            responseText,
            requestData: requestData ? JSON.stringify(requestData) : null,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log UI state errors (missing elements, etc.)
     */
    logUIError(component, action, details) {
        this.logError({
            type: 'ui_error',
            message: `UI Error in ${component} during ${action}`,
            component,
            action,
            details,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get current active tab
     */
    getCurrentTab() {
        const activeTab = document.querySelector('.tab-btn.active');
        return activeTab ? activeTab.dataset.tab : 'unknown';
    }

    /**
     * Get or create session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('traefik_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('traefik_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Get relevant localStorage data (without sensitive info)
     */
    getRelevantLocalStorage() {
        const relevant = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('traefik_') || key.includes('theme') || key.includes('config'))) {
                    // Don't include sensitive data like passwords or keys
                    if (!key.includes('password') && !key.includes('secret') && !key.includes('key')) {
                        relevant[key] = localStorage.getItem(key);
                    }
                }
            }
        } catch (e) {
            relevant.error = 'Could not read localStorage';
        }
        return relevant;
    }

    /**
     * Get basic performance metrics
     */
    getPerformanceMetrics() {
        if (!window.performance) return null;
        
        const timing = performance.timing;
        return {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null
        };
    }

    /**
     * Store error in localStorage for persistence
     */
    storeErrorInLocalStorage(error) {
        try {
            const stored = JSON.parse(localStorage.getItem('traefik_error_log') || '[]');
            stored.push(error);
            
            // Keep only last 50 errors to prevent localStorage bloat
            if (stored.length > 50) {
                stored.splice(0, stored.length - 50);
            }
            
            localStorage.setItem('traefik_error_log', JSON.stringify(stored));
        } catch (e) {
            console.warn('Could not store error in localStorage:', e);
        }
    }

    /**
     * Sync errors to server
     */
    async syncErrorsToServer() {
        if (this.errorQueue.length === 0) return;

        try {
            const errors = [...this.errorQueue];
            this.errorQueue = []; // Clear queue immediately

            const response = await fetch('/api/errors/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ errors })
            });

            if (!response.ok) {
                // Put errors back in queue if sending failed
                this.errorQueue.unshift(...errors);
                throw new Error(`HTTP ${response.status}`);
            }

            // Clear successfully sent errors from localStorage
            this.clearSentErrorsFromStorage(errors);

        } catch (error) {
            console.warn('Failed to sync errors to server:', error);
            // Errors remain in queue for next attempt
        }
    }

    /**
     * Clear sent errors from localStorage
     */
    clearSentErrorsFromStorage(sentErrors) {
        try {
            const stored = JSON.parse(localStorage.getItem('traefik_error_log') || '[]');
            const sentTimestamps = sentErrors.map(e => e.timestamp);
            const remaining = stored.filter(e => !sentTimestamps.includes(e.timestamp));
            localStorage.setItem('traefik_error_log', JSON.stringify(remaining));
        } catch (e) {
            console.warn('Could not clear sent errors from localStorage:', e);
        }
    }

    /**
     * Start periodic sync (every 30 seconds)
     */
    startPeriodicSync() {
        setInterval(() => {
            if (this.isOnline && this.errorQueue.length > 0) {
                this.syncErrorsToServer();
            }
        }, 30000);
    }

    /**
     * Manual error reporting for components
     */
    static logComponentError(component, action, error, additionalData = {}) {
        if (window.errorLogger) {
            window.errorLogger.logError({
                type: 'component_error',
                message: `${component}: ${action} failed - ${error.message || error}`,
                component,
                action,
                stack: error.stack,
                additionalData,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get error summary for debugging
     */
    getErrorSummary() {
        try {
            const stored = JSON.parse(localStorage.getItem('traefik_error_log') || '[]');
            const summary = {
                totalErrors: stored.length,
                recentErrors: stored.slice(-10),
                errorTypes: {},
                commonComponents: {}
            };

            stored.forEach(error => {
                summary.errorTypes[error.type] = (summary.errorTypes[error.type] || 0) + 1;
                if (error.component) {
                    summary.commonComponents[error.component] = (summary.commonComponents[error.component] || 0) + 1;
                }
            });

            return summary;
        } catch (e) {
            return { error: 'Could not generate summary' };
        }
    }
}

// Initialize global error logger
window.errorLogger = new TraefikErrorLogger();

// Make static method available globally
window.logComponentError = TraefikErrorLogger.logComponentError;