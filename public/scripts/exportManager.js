/**
 * Export Manager
 * Handles diagram export to PNG and JSON formats
 */

export class ExportManager {
    constructor(editor) {
        this.editor = editor;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const exportPngBtn = document.getElementById('export-png-btn');
        const saveJsonBtn = document.getElementById('save-json-btn');
        const clearCanvasBtn = document.getElementById('clear-canvas-btn');

        exportPngBtn.addEventListener('click', () => this.exportToPNG());
        saveJsonBtn.addEventListener('click', () => this.saveAsJSON());
        clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
    }

    async exportToPNG() {
        try {
            // Show loading message
            window.showToast('Generating high-quality PNG...', 'info');

            // Use high-quality export method
            const dataURL = await this.editor.exportToPNG({
                scale: 2,           // 2x resolution for retina quality
                padding: 100,       // 100px padding around diagram
                backgroundColor: '#FFFFFF'  // White background
            });
            
            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const diagramName = this.editor.getDiagramName() || 'diagram';
            const safeName = diagramName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            link.download = `${safeName}-${timestamp}.png`;
            link.href = dataURL;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.showToast('High-quality PNG exported successfully!', 'success');
        } catch (error) {
            console.error('PNG export error:', error);
            if (error.message === 'No nodes to export') {
                window.showToast('Canvas is empty, nothing to export', 'warning');
            } else {
                window.showToast('Failed to export PNG: ' + error.message, 'error');
            }
        }
    }

    async saveAsJSON() {
        try {
            const diagram = this.editor.getDiagram();
            
            if (!diagram.nodes || diagram.nodes.length === 0) {
                window.showToast('Canvas is empty, nothing to save', 'warning');
                return;
            }

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `diagram-${timestamp}`;

            // Save to server
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    diagram: diagram,
                    filename: filename
                })
            });

            const result = await response.json();

            if (result.success) {
                // Also download to client
                this.downloadJSON(diagram, filename + '.json');
                window.showToast('Diagram saved successfully', 'success');
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (error) {
            console.error('JSON save error:', error);
            window.showToast('Failed to save diagram', 'error');
        }
    }

    downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    clearCanvas() {
        const confirm = window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.');
        
        if (confirm) {
            this.editor.clearDiagram();
            window.showToast('Canvas cleared', 'info');
        }
    }
}
