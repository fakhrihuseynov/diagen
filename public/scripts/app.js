/**
 * Main Application Controller
 * Manages navigation, page routing, and module initialization
 */

import { DiagramEditor } from './diagramEditor.js';
import { AIGenerator } from './aiGenerator.js';
import { FileHandler } from './fileHandler.js';
import { ExportManager } from './exportManager.js';
import { SettingsManager } from './settingsManager.js';
import { IconLoader } from './iconLoader.js';

class App {
    constructor() {
        this.currentPage = 'home';
        this.modules = {};
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Diagen...');
        
        // Initialize modules
        this.modules.editor = new DiagramEditor('diagram-canvas');
        this.modules.aiGenerator = new AIGenerator(this.modules.editor);
        this.modules.fileHandler = new FileHandler(this.modules.editor);
        this.modules.exportManager = new ExportManager(this.modules.editor);
        this.modules.settingsManager = new SettingsManager();
        this.modules.iconLoader = new IconLoader();

        // Setup navigation
        this.setupNavigation();
        
        // Load icons
        await this.modules.iconLoader.loadIcons();
        
        // Check Ollama connection on startup
        await this.modules.settingsManager.checkConnection();
        
        console.log('✅ Diagen initialized successfully');
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
            });
        });
    }

    navigateToPage(pageName) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            }
        });

        // Update active page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;
            
            // Trigger page-specific actions
            this.onPageChange(pageName);
        }
    }

    onPageChange(pageName) {
        switch(pageName) {
            case 'export':
                // Redraw canvas when navigating to export page
                this.modules.editor.render();
                break;
            case 'settings':
                // Refresh connection status
                this.modules.settingsManager.checkConnection();
                break;
        }
    }

    // Global toast notification
    static showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Global loading overlay
    static showLoading(show = true) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Export utilities globally
window.showToast = App.showToast;
window.showLoading = App.showLoading;
