/**
 * Icon Search Modal
 * Allows users to search and replace icons in the diagram
 */

export class IconSearchModal {
    constructor() {
        this.modal = document.getElementById('icon-search-modal');
        this.searchInput = document.getElementById('icon-search-input');
        this.iconGrid = document.getElementById('icon-grid');
        this.closeBtn = document.getElementById('close-icon-modal');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        this.allIcons = [];
        this.filteredIcons = [];
        this.currentFilter = 'all';
        this.onIconSelected = null;
        this.selectedNode = null;
        
        this.setupEventListeners();
        this.loadIconDatabase();
    }
    
    setupEventListeners() {
        // Close modal
        this.closeBtn.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        // Search input
        this.searchInput.addEventListener('input', () => this.filterIcons());
        
        // Filter tabs
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.filterIcons();
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }
    
    async loadIconDatabase() {
        try {
            const response = await fetch('/icon-database.json');
            const data = await response.json();
            
            // Flatten the icon database into a searchable array
            this.allIcons = [];
            
            for (const [key, icons] of Object.entries(data)) {
                icons.forEach(icon => {
                    // Determine provider from path
                    let provider = 'General';
                    if (icon.exactPath.includes('/AWS/')) provider = 'AWS';
                    else if (icon.exactPath.includes('/Azure/')) provider = 'Azure';
                    else if (icon.exactPath.includes('/GCP/')) provider = 'GCP';
                    else if (icon.exactPath.includes('/Kubernetes/')) provider = 'Kubernetes';
                    
                    // Get category from path
                    const pathParts = icon.exactPath.split('/');
                    const category = pathParts[pathParts.length - 2] || 'Other';
                    
                    this.allIcons.push({
                        path: icon.exactPath,
                        filename: icon.filename,
                        searchTerms: icon.searchTerms || [],
                        provider: provider,
                        category: category,
                        displayName: icon.filename.replace('.svg', '').replace(/-/g, ' ')
                    });
                });
            }
            
            console.log(`Loaded ${this.allIcons.length} icons from database`);
            this.filteredIcons = this.allIcons;
        } catch (error) {
            console.error('Failed to load icon database:', error);
            this.iconGrid.innerHTML = '<div class="icon-grid-loading">Failed to load icons</div>';
        }
    }
    
    filterIcons() {
        const searchQuery = this.searchInput.value.toLowerCase().trim();
        
        this.filteredIcons = this.allIcons.filter(icon => {
            // Filter by provider
            if (this.currentFilter !== 'all' && icon.provider !== this.currentFilter) {
                return false;
            }
            
            // Filter by search query
            if (searchQuery) {
                const matchesFilename = icon.filename.toLowerCase().includes(searchQuery);
                const matchesDisplayName = icon.displayName.toLowerCase().includes(searchQuery);
                const matchesCategory = icon.category.toLowerCase().includes(searchQuery);
                const matchesSearchTerms = icon.searchTerms.some(term => 
                    term.toLowerCase().includes(searchQuery)
                );
                
                return matchesFilename || matchesDisplayName || matchesCategory || matchesSearchTerms;
            }
            
            return true;
        });
        
        this.renderIcons();
    }
    
    renderIcons() {
        if (this.filteredIcons.length === 0) {
            this.iconGrid.innerHTML = '<div class="icon-grid-loading">No icons found</div>';
            return;
        }
        
        // Limit displayed icons for performance
        const maxDisplay = 200;
        const iconsToDisplay = this.filteredIcons.slice(0, maxDisplay);
        
        this.iconGrid.innerHTML = iconsToDisplay.map(icon => `
            <div class="icon-item" data-icon-path="${icon.path}" title="${icon.displayName}">
                <img src="${icon.path}" alt="${icon.displayName}" loading="lazy">
                <div class="icon-item-name">${icon.displayName}</div>
            </div>
        `).join('');
        
        if (this.filteredIcons.length > maxDisplay) {
            this.iconGrid.innerHTML += `
                <div class="icon-grid-loading">
                    Showing ${maxDisplay} of ${this.filteredIcons.length} icons. 
                    Refine your search to see more.
                </div>
            `;
        }
        
        // Add click handlers
        this.iconGrid.querySelectorAll('.icon-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const iconPath = item.dataset.iconPath;
                console.log('Icon item clicked:', iconPath);
                this.selectIcon(iconPath);
            });
        });
    }
    
    selectIcon(iconPath) {
        console.log('selectIcon called:', { iconPath, hasCallback: !!this.onIconSelected, hasNode: !!this.selectedNode });
        if (this.onIconSelected && this.selectedNode) {
            this.onIconSelected(this.selectedNode, iconPath);
            this.close();
        } else {
            console.warn('Cannot select icon: missing callback or node');
        }
    }
    
    open(node, onIconSelected) {
        this.selectedNode = node;
        this.onIconSelected = onIconSelected;
        
        // Auto-detect provider from existing diagram
        const detectedProvider = this.detectProviderFromNode(node);
        if (detectedProvider) {
            this.currentFilter = detectedProvider;
            this.filterTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filter === detectedProvider);
            });
        }
        
        // Set search hint based on node label
        this.searchInput.value = '';
        this.searchInput.placeholder = `Search icons... (e.g., ${node.label})`;
        
        this.modal.classList.add('active');
        this.filterIcons();
        
        // Focus search input
        setTimeout(() => this.searchInput.focus(), 100);
    }
    
    close() {
        this.modal.classList.remove('active');
        this.selectedNode = null;
        this.onIconSelected = null;
        this.searchInput.value = '';
    }
    
    detectProviderFromNode(node) {
        if (!node.icon) return null;
        
        const path = node.icon.toLowerCase();
        if (path.includes('/aws/')) return 'AWS';
        if (path.includes('/azure/')) return 'Azure';
        if (path.includes('/gcp/')) return 'GCP';
        if (path.includes('/kubernetes/')) return 'Kubernetes';
        
        return null;
    }
}
