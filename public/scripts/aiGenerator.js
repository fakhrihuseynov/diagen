/**
 * AI Generator
 * Handles markdown upload and AI-powered diagram generation
 */

export class AIGenerator {
    constructor(editor) {
        this.editor = editor;
        this.currentMarkdown = '';
        this.currentFilePath = '';
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Upload zone
        const uploadZone = document.getElementById('md-upload-zone');
        const fileInput = document.getElementById('md-file-input');
        const browseBtn = document.getElementById('browse-md-btn');
        const generateBtn = document.getElementById('generate-btn');

        // Click to browse
        uploadZone.addEventListener('click', () => fileInput.click());
        browseBtn.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Generate button
        generateBtn.addEventListener('click', () => {
            this.generateDiagram();
        });
    }

    async handleFileUpload(file) {
        const allowedExtensions = ['.md', '.txt'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            window.showToast('Please upload a .md or .txt file', 'error');
            return;
        }

        // Show loading
        this.updateStatus('Uploading file...', 'processing');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload/markdown', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.currentMarkdown = result.content;
                this.currentFilePath = result.path;
                
                this.displayMarkdownPreview(result.content);
                this.updateStatus(`File loaded: ${result.filename}`, 'success');
                
                // Enable generate button
                document.getElementById('generate-btn').disabled = false;
                
                window.showToast('Markdown file uploaded successfully', 'success');
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.updateStatus('Upload failed: ' + error.message, 'error');
            window.showToast('Failed to upload file', 'error');
        }
    }

    displayMarkdownPreview(content) {
        const preview = document.getElementById('markdown-preview');
        preview.innerHTML = '';
        
        // Simple markdown-like preview
        const lines = content.split('\n');
        lines.forEach(line => {
            const p = document.createElement('p');
            
            if (line.startsWith('#')) {
                p.style.fontWeight = 'bold';
                p.style.fontSize = '1.1em';
                p.style.marginTop = '1em';
            } else if (line.startsWith('-') || line.startsWith('*')) {
                p.style.paddingLeft = '1em';
            }
            
            p.textContent = line;
            preview.appendChild(p);
        });
    }

    async generateDiagram() {
        if (!this.currentMarkdown) {
            window.showToast('Please upload a markdown file first', 'warning');
            return;
        }

        this.updateStatus('Generating diagram with AI...', 'processing');
        window.showLoading(true);

        try {
            // Get selected model from settings
            const modelSelect = document.getElementById('model-select');
            const model = modelSelect ? modelSelect.value : 'qwen2.5-coder:7b';

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    markdown: this.currentMarkdown,
                    model: model
                })
            });

            const result = await response.json();

            if (result.success && result.diagram) {
                this.updateStatus('Diagram generated successfully!', 'success');
                
                // Load diagram into editor
                this.editor.loadDiagram(result.diagram);
                
                window.showToast('Diagram generated! Navigate to Export to view', 'success');
                
                // Auto-navigate to export page after 1.5 seconds
                setTimeout(() => {
                    document.querySelector('[data-page="export"]').click();
                }, 1500);
            } else {
                throw new Error(result.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Generation error:', error);
            this.updateStatus('Generation failed: ' + error.message, 'error');
            window.showToast('Failed to generate diagram', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    updateStatus(message, type = 'info') {
        const statusBox = document.getElementById('generation-status');
        const statusMessage = statusBox.querySelector('.status-message');
        
        statusMessage.textContent = message;
        
        // Update status box styling
        statusBox.className = 'status-box';
        if (type !== 'info') {
            statusBox.classList.add(type);
        }
    }
}
