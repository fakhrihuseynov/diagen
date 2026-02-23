/**
 * Settings Manager
 * Handles application settings, model selection, and Ollama connection
 */

export class SettingsManager {
    constructor() {
        this.settings = {
            model: 'qwen2.5-coder:7b',
            autoLayout: true,
            orthogonalEdges: true,
            gridSize: 20
        };
        
        this.loadSettings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const modelSelect = document.getElementById('model-select');
        const autoLayoutCheckbox = document.getElementById('auto-layout');
        const orthogonalEdgesCheckbox = document.getElementById('orthogonal-edges');
        const gridSizeInput = document.getElementById('grid-size');
        const refreshModelsBtn = document.getElementById('refresh-models-btn');

        // Model selection
        if (modelSelect) {
            modelSelect.value = this.settings.model;
            modelSelect.addEventListener('change', (e) => {
                this.settings.model = e.target.value;
                this.saveSettings();
                window.showToast(`Model changed to ${e.target.value}`, 'info');
            });
        }

        // Auto layout
        if (autoLayoutCheckbox) {
            autoLayoutCheckbox.checked = this.settings.autoLayout;
            autoLayoutCheckbox.addEventListener('change', (e) => {
                this.settings.autoLayout = e.target.checked;
                this.saveSettings();
            });
        }

        // Orthogonal edges
        if (orthogonalEdgesCheckbox) {
            orthogonalEdgesCheckbox.checked = this.settings.orthogonalEdges;
            orthogonalEdgesCheckbox.addEventListener('change', (e) => {
                this.settings.orthogonalEdges = e.target.checked;
                this.saveSettings();
            });
        }

        // Grid size
        if (gridSizeInput) {
            gridSizeInput.value = this.settings.gridSize;
            gridSizeInput.addEventListener('change', (e) => {
                this.settings.gridSize = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        // Refresh models
        if (refreshModelsBtn) {
            refreshModelsBtn.addEventListener('click', () => {
                this.checkConnection();
            });
        }
    }

    async checkConnection() {
        const statusElement = document.getElementById('connection-status');
        const modelsListElement = document.getElementById('available-models');

        if (statusElement) {
            statusElement.className = 'connection-status';
            statusElement.querySelector('.status-text').textContent = 'Checking connection...';
        }

        try {
            const response = await fetch('/api/ollama/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success && result.models) {
                // Update connection status
                if (statusElement) {
                    statusElement.classList.add('connected');
                    statusElement.querySelector('.status-text').textContent = 'Connected to Ollama';
                }

                // Display available models
                if (modelsListElement) {
                    this.displayModels(result.models, modelsListElement);
                }

                return true;
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (error) {
            console.error('Ollama connection error:', error);
            
            if (statusElement) {
                statusElement.classList.add('disconnected');
                statusElement.querySelector('.status-text').textContent = 'Cannot connect to Ollama';
            }

            if (modelsListElement) {
                modelsListElement.innerHTML = `
                    <p class="error-text" style="color: var(--error);">
                        ⚠️ Cannot connect to Ollama server.<br>
                        Make sure Ollama is running on http://localhost:11434
                    </p>
                `;
            }

            return false;
        }
    }

    displayModels(models, container) {
        if (!models || models.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No models found. Please pull models using Ollama CLI.</p>';
            return;
        }

        container.innerHTML = '';
        
        models.forEach(model => {
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            
            const modelName = document.createElement('span');
            modelName.className = 'model-name';
            modelName.textContent = model.name;
            
            const modelSize = document.createElement('span');
            modelSize.className = 'model-size';
            modelSize.textContent = this.formatSize(model.size);
            
            modelItem.appendChild(modelName);
            modelItem.appendChild(modelSize);
            
            container.appendChild(modelItem);
        });
    }

    formatSize(bytes) {
        if (!bytes) return 'Unknown size';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('diagen-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('diagen-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }
}
