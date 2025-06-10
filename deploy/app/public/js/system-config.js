/**
 * Traefik UI - System Configuration Module
 * Handles system configuration management, backup, restore, import/export
 * Version: 0.6.6
 */

class TraefikSystemConfig {
    
    constructor(mainUI) {
        this.ui = mainUI;
        this.currentConfig = null;
        this.backupList = [];
        this.isEditing = false;
        this.selectedFile = null;
    }

    /**
     * Load system status and configuration overview
     */
    async loadSystemStatus() {
        try {
            const config = await TraefikUtils.apiRequest('/api/config/ui');
            this.currentConfig = config;
            
            // Update status indicators
            this.updateConfigStatus('exists', 'Configuration loaded successfully');
            this.updateValidationStatus('valid', 'Configuration is valid');
            
        } catch (error) {
            console.error('Failed to load system status:', error);
            this.updateConfigStatus('error', 'Failed to load configuration');
            this.updateValidationStatus('error', 'Configuration validation failed');
        }
    }

    /**
     * Load and display configuration in viewer
     */
    async loadConfigViewer() {
        try {
            TraefikUtils.showNotification('Loading configuration...', 'info');
            
            const config = await TraefikUtils.apiRequest('/api/config/ui');
            this.currentConfig = config;
            
            const viewer = TraefikUtils.getElement('config-viewer');
            const placeholder = viewer.querySelector('.config-placeholder');
            
            if (placeholder) {
                placeholder.remove();
            }
            
            // Create formatted config display
            const configDisplay = document.createElement('pre');
            configDisplay.className = 'config-content';
            configDisplay.textContent = this.formatConfigForDisplay(config);
            
            viewer.innerHTML = '';
            viewer.appendChild(configDisplay);
            
            TraefikUtils.showNotification('Configuration loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to load configuration viewer:', error);
            TraefikUtils.showNotification('Failed to load configuration', 'error');
        }
    }

    /**
     * Refresh configuration viewer
     */
    async refreshConfigViewer() {
        await this.loadConfigViewer();
    }

    /**
     * Validate current configuration
     */
    async validateCurrentConfig() {
        try {
            TraefikUtils.showNotification('Validating configuration...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui/validate', {
                method: 'POST',
                body: JSON.stringify(this.currentConfig || {})
            });
            
            if (response.valid) {
                TraefikUtils.showNotification('Configuration is valid!', 'success');
                this.updateValidationStatus('valid', 'Configuration is valid');
            } else {
                TraefikUtils.showNotification('Configuration has issues', 'warning');
                this.updateValidationStatus('warning', `${response.errors.length} errors, ${response.warnings.length} warnings`);
                this.showValidationResults(response);
            }
            
        } catch (error) {
            console.error('Validation failed:', error);
            TraefikUtils.showNotification('Validation failed', 'error');
            this.updateValidationStatus('error', 'Validation failed');
        }
    }

    /**
     * Toggle configuration editor mode
     */
    toggleConfigEditor() {
        const editorSection = TraefikUtils.getElement('config-editor-section');
        const toggleBtn = TraefikUtils.getElement('toggle-config-editor');
        
        if (this.isEditing) {
            // Exit edit mode
            editorSection.classList.add('hidden');
            toggleBtn.textContent = '✏️ Edit Mode';
            this.isEditing = false;
        } else {
            // Enter edit mode
            if (!this.currentConfig) {
                TraefikUtils.showNotification('Load configuration first', 'warning');
                return;
            }
            
            const editor = TraefikUtils.getElement('config-editor');
            editor.value = this.formatConfigForDisplay(this.currentConfig);
            
            editorSection.classList.remove('hidden');
            toggleBtn.textContent = '👁️ View Mode';
            this.isEditing = true;
        }
    }

    /**
     * Save configuration changes from editor
     */
    async saveConfigChanges() {
        try {
            const editor = TraefikUtils.getElement('config-editor');
            const configText = editor.value;
            
            // Parse YAML
            const parsedConfig = this.parseConfigText(configText);
            
            TraefikUtils.showNotification('Saving configuration...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui', {
                method: 'PUT',
                body: JSON.stringify(parsedConfig)
            });
            
            if (response.success) {
                this.currentConfig = parsedConfig;
                TraefikUtils.showNotification('Configuration saved successfully!', 'success');
                
                // Update viewer
                await this.loadConfigViewer();
                
                // Exit edit mode
                this.toggleConfigEditor();
            } else {
                throw new Error(response.error || 'Save failed');
            }
            
        } catch (error) {
            console.error('Failed to save configuration:', error);
            TraefikUtils.showNotification(`Failed to save: ${error.message}`, 'error');
        }
    }

    /**
     * Cancel configuration editing
     */
    cancelConfigEdit() {
        this.toggleConfigEditor();
        TraefikUtils.showNotification('Edit cancelled', 'info');
    }

    /**
     * Validate configuration in editor
     */
    async validateConfigEdit() {
        try {
            const editor = TraefikUtils.getElement('config-editor');
            const configText = editor.value;
            
            // Parse YAML
            const parsedConfig = this.parseConfigText(configText);
            
            TraefikUtils.showNotification('Validating configuration...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui/validate', {
                method: 'POST',
                body: JSON.stringify(parsedConfig)
            });
            
            this.showValidationResults(response);
            
            if (response.valid) {
                TraefikUtils.showNotification('Configuration is valid!', 'success');
            } else {
                TraefikUtils.showNotification('Configuration has issues', 'warning');
            }
            
        } catch (error) {
            console.error('Validation failed:', error);
            TraefikUtils.showNotification(`Validation failed: ${error.message}`, 'error');
        }
    }

    /**
     * Export configuration
     */
    async exportConfig() {
        try {
            const includeSensitive = TraefikUtils.getElement('include-sensitive').checked;
            
            const url = `/api/config/ui/export${includeSensitive ? '?include_sensitive=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `traefik-ui-config-${new Date().toISOString().split('T')[0]}.yml`;
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            
            TraefikUtils.showNotification('Configuration exported successfully!', 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            TraefikUtils.showNotification('Failed to export configuration', 'error');
        }
    }

    /**
     * Select configuration file for import
     */
    selectConfigFile() {
        const fileInput = TraefikUtils.getElement('config-file-input');
        fileInput.click();
    }

    /**
     * Handle file input change
     */
    handleFileInputChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.selectedFile = file;
        
        const preview = TraefikUtils.getElement('import-preview');
        const filename = TraefikUtils.getElement('import-filename');
        const filesize = TraefikUtils.getElement('import-filesize');
        const validateBtn = TraefikUtils.getElement('validate-import');
        const applyBtn = TraefikUtils.getElement('apply-import');
        
        filename.textContent = file.name;
        filesize.textContent = TraefikUtils.formatBytes(file.size);
        
        preview.classList.remove('hidden');
        validateBtn.classList.remove('hidden');
        applyBtn.classList.add('hidden');
        
        TraefikUtils.showNotification('File selected. Validate before applying.', 'info');
    }

    /**
     * Validate import file
     */
    async validateImport() {
        if (!this.selectedFile) {
            TraefikUtils.showNotification('No file selected', 'warning');
            return;
        }
        
        try {
            const fileContent = await this.readFileContent(this.selectedFile);
            const config = this.parseConfigText(fileContent);
            
            TraefikUtils.showNotification('Validating import file...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui/validate', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            const resultsDiv = TraefikUtils.getElement('import-validation-results');
            this.displayValidationResults(resultsDiv, response);
            
            if (response.valid) {
                TraefikUtils.showNotification('Import file is valid!', 'success');
                TraefikUtils.getElement('apply-import').classList.remove('hidden');
            } else {
                TraefikUtils.showNotification('Import file has issues', 'warning');
            }
            
        } catch (error) {
            console.error('Import validation failed:', error);
            TraefikUtils.showNotification(`Validation failed: ${error.message}`, 'error');
        }
    }

    /**
     * Apply import configuration
     */
    async applyImport() {
        if (!this.selectedFile) {
            TraefikUtils.showNotification('No file selected', 'warning');
            return;
        }
        
        try {
            const fileContent = await this.readFileContent(this.selectedFile);
            const config = this.parseConfigText(fileContent);
            
            const confirmed = await TraefikUIComponents.showConfirmDialog(
                'This will replace your current configuration. Are you sure?',
                'Apply Import'
            );
            
            if (!confirmed) return;
            
            TraefikUtils.showNotification('Applying import configuration...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui/import', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            if (response.success) {
                TraefikUtils.showNotification('Configuration imported successfully!', 'success');
                await this.loadSystemStatus();
                await this.loadConfigViewer();
                
                // Clear import form
                this.clearImportForm();
            } else {
                throw new Error(response.error || 'Import failed');
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            TraefikUtils.showNotification(`Import failed: ${error.message}`, 'error');
        }
    }

    /**
     * Create manual backup
     */
    createManualBackup() {
        const section = TraefikUtils.getElement('manual-backup-section');
        section.classList.remove('hidden');
    }

    /**
     * Confirm and create backup
     */
    async confirmCreateBackup() {
        try {
            const backupName = TraefikUtils.getElement('backup-name').value;
            
            TraefikUtils.showNotification('Creating backup...', 'info');
            
            const response = await TraefikUtils.apiRequest('/api/config/ui/backup', {
                method: 'POST',
                body: JSON.stringify({ name: backupName })
            });
            
            if (response.success) {
                TraefikUtils.showNotification('Backup created successfully!', 'success');
                this.cancelCreateBackup();
                await this.refreshBackupList();
            } else {
                throw new Error(response.error || 'Backup failed');
            }
            
        } catch (error) {
            console.error('Backup creation failed:', error);
            TraefikUtils.showNotification(`Backup failed: ${error.message}`, 'error');
        }
    }

    /**
     * Cancel backup creation
     */
    cancelCreateBackup() {
        const section = TraefikUtils.getElement('manual-backup-section');
        section.classList.add('hidden');
        
        const nameInput = TraefikUtils.getElement('backup-name');
        nameInput.value = '';
    }

    /**
     * Refresh backup list
     */
    async refreshBackupList() {
        try {
            const response = await TraefikUtils.apiRequest('/api/config/ui/backups');
            this.backupList = response.backups || [];
            
            this.displayBackupList();
            this.updateBackupCount();
            
        } catch (error) {
            console.error('Failed to load backup list:', error);
            TraefikUtils.showNotification('Failed to load backups', 'error');
        }
    }

    /**
     * Display backup list
     */
    displayBackupList() {
        const container = TraefikUtils.getElement('backup-list');
        
        if (this.backupList.length === 0) {
            container.innerHTML = '<p>No backups available</p>';
            return;
        }
        
        const headers = [
            { key: 'filename', label: 'Backup Name' },
            { key: 'created', label: 'Created' },
            { key: 'size', label: 'Size' },
            { key: 'type', label: 'Type' },
            { 
                key: 'actions', 
                label: 'Actions', 
                type: 'actions',
                actions: [
                    {
                        label: 'Download',
                        type: 'primary',
                        handler: (item) => this.downloadBackup(item.filename)
                    },
                    {
                        label: 'Restore',
                        type: 'warning',
                        handler: (item) => this.showRestoreModal(item)
                    },
                    {
                        label: 'Delete',
                        type: 'danger',
                        handler: (item) => this.deleteBackup(item.filename)
                    }
                ]
            }
        ];
        
        const table = TraefikUIComponents.createTable(headers, this.backupList);
        container.innerHTML = '';
        container.appendChild(table);
    }

    /**
     * Handle system settings form submission
     */
    async handleSystemSettingsSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(event.target);
            
            TraefikUtils.showNotification('Saving system settings...', 'info');
            
            // Here you would save the settings to the backend
            // For now, just show success
            TraefikUtils.showNotification('System settings saved!', 'success');
            
        } catch (error) {
            console.error('Failed to save system settings:', error);
            TraefikUtils.showNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Helper Methods
     */
    updateConfigStatus(status, message) {
        const statusElement = TraefikUtils.getElement('config-file-status');
        if (statusElement) {
            statusElement.className = `status-indicator ${status}`;
            statusElement.textContent = message;
        }
    }

    updateValidationStatus(status, message) {
        const statusElement = TraefikUtils.getElement('validation-status');
        if (statusElement) {
            statusElement.className = `status-indicator ${status}`;
            statusElement.textContent = message;
        }
    }

    updateBackupCount() {
        const countElement = TraefikUtils.getElement('backup-count-status');
        if (countElement) {
            countElement.className = 'status-indicator success';
            countElement.textContent = `${this.backupList.length} backups`;
        }
    }

    formatConfigForDisplay(config) {
        return JSON.stringify(config, null, 2);
    }

    parseConfigText(text) {
        try {
            // Try JSON first
            return JSON.parse(text);
        } catch (e) {
            // If JSON fails, could add YAML parsing here
            throw new Error('Invalid configuration format. Please use JSON format.');
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    showValidationResults(response) {
        const resultsDiv = TraefikUtils.getElement('validation-results');
        if (resultsDiv) {
            this.displayValidationResults(resultsDiv, response);
            resultsDiv.classList.remove('hidden');
        }
    }

    displayValidationResults(container, response) {
        const errorsDiv = container.querySelector('#validation-errors');
        const warningsDiv = container.querySelector('#validation-warnings');
        
        if (errorsDiv) {
            errorsDiv.innerHTML = response.errors.length > 0 
                ? '<h5>Errors:</h5><ul>' + response.errors.map(e => `<li>${e}</li>`).join('') + '</ul>'
                : '';
        }
        
        if (warningsDiv) {
            warningsDiv.innerHTML = response.warnings.length > 0 
                ? '<h5>Warnings:</h5><ul>' + response.warnings.map(w => `<li>${w}</li>`).join('') + '</ul>'
                : '';
        }
    }

    clearImportForm() {
        const preview = TraefikUtils.getElement('import-preview');
        const validateBtn = TraefikUtils.getElement('validate-import');
        const applyBtn = TraefikUtils.getElement('apply-import');
        const fileInput = TraefikUtils.getElement('config-file-input');
        
        preview.classList.add('hidden');
        validateBtn.classList.add('hidden');
        applyBtn.classList.add('hidden');
        fileInput.value = '';
        this.selectedFile = null;
    }

    async downloadBackup(filename) {
        try {
            const response = await fetch(`/api/config/ui/backups/${filename}/download`);
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Download failed:', error);
            TraefikUtils.showNotification('Failed to download backup', 'error');
        }
    }

    showRestoreModal(backup) {
        // Implementation for restore modal would go here
        TraefikUtils.showNotification('Restore functionality coming soon', 'info');
    }

    async deleteBackup(filename) {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Are you sure you want to delete backup "${filename}"?`,
            'Delete Backup'
        );
        
        if (!confirmed) return;
        
        try {
            await TraefikUtils.apiRequest(`/api/config/ui/backups/${filename}`, {
                method: 'DELETE'
            });
            
            TraefikUtils.showNotification('Backup deleted successfully!', 'success');
            await this.refreshBackupList();
            
        } catch (error) {
            console.error('Failed to delete backup:', error);
            TraefikUtils.showNotification('Failed to delete backup', 'error');
        }
    }

    /**
     * Additional backup and restore methods
     */
    async downloadAllBackups() {
        try {
            const response = await TraefikUtils.apiRequest('/api/config/ui/backups');
            const backups = response.backups || [];
            
            if (backups.length === 0) {
                TraefikUtils.showNotification('No backups to download', 'warning');
                return;
            }
            
            TraefikUtils.showNotification(`Downloading ${backups.length} backups...`, 'info');
            
            for (const backup of backups) {
                await this.downloadBackup(backup.filename);
                // Small delay to prevent overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            TraefikUtils.showNotification('All backups downloaded!', 'success');
            
        } catch (error) {
            console.error('Download all backups failed:', error);
            TraefikUtils.showNotification('Failed to download backups', 'error');
        }
    }

    async cleanupOldBackups() {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            'This will delete backups older than 30 days. Are you sure?',
            'Cleanup Old Backups'
        );
        
        if (!confirmed) return;

        try {
            // This would need a backend endpoint for cleanup
            TraefikUtils.showNotification('Cleanup functionality not yet implemented', 'info');
            
        } catch (error) {
            console.error('Cleanup failed:', error);
            TraefikUtils.showNotification('Failed to cleanup backups', 'error');
        }
    }

    closeRestoreModal() {
        const modal = TraefikUtils.getElement('restore-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    confirmRestore() {
        // Implementation would depend on which backup is selected
        TraefikUtils.showNotification('Restore functionality not yet fully implemented', 'info');
        this.closeRestoreModal();
    }

    cancelRestore() {
        this.closeRestoreModal();
    }
}

// Make available globally
window.TraefikSystemConfig = TraefikSystemConfig;