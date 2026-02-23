/**
 * Icon Loader
 * Manages loading and caching of cloud service icons
 */

export class IconLoader {
    constructor() {
        this.icons = {};
        this.loaded = false;
    }

    async loadIcons() {
        if (this.loaded) {
            return this.icons;
        }

        try {
            const response = await fetch('/api/icons');
            const result = await response.json();

            if (result.success && result.icons) {
                this.icons = result.icons;
                this.loaded = true;
                console.log('✅ Icons loaded successfully');
                return this.icons;
            } else {
                console.warn('Failed to load icons:', result.error);
                return {};
            }
        } catch (error) {
            console.error('Error loading icons:', error);
            return {};
        }
    }

    getIconsByProvider(provider) {
        if (!this.loaded) {
            console.warn('Icons not loaded yet');
            return [];
        }

        const providerFolder = this.icons.find(
            item => item.type === 'directory' && item.name === provider
        );

        return providerFolder ? providerFolder.children : [];
    }

    searchIcons(query) {
        if (!this.loaded) {
            return [];
        }

        const results = [];
        const searchTerm = query.toLowerCase();

        const search = (items) => {
            items.forEach(item => {
                if (item.type === 'icon' && item.name.toLowerCase().includes(searchTerm)) {
                    results.push(item);
                } else if (item.type === 'directory' && item.children) {
                    search(item.children);
                }
            });
        };

        search(this.icons);
        return results;
    }

    getAllIcons() {
        if (!this.loaded) {
            return [];
        }

        const allIcons = [];

        const collect = (items) => {
            items.forEach(item => {
                if (item.type === 'icon') {
                    allIcons.push(item);
                } else if (item.type === 'directory' && item.children) {
                    collect(item.children);
                }
            });
        };

        collect(this.icons);
        return allIcons;
    }

    getIconPath(iconName) {
        const allIcons = this.getAllIcons();
        const icon = allIcons.find(i => i.name === iconName);
        return icon ? icon.path : null;
    }
}
