/**
 * File Handler
 * Manages JSON diagram file uploads and loading
 */

export class FileHandler {
    constructor(editor) {
        this.editor = editor;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // JSON upload zone
        const uploadZone = document.getElementById('json-upload-zone');
        const fileInput = document.getElementById('json-file-input');
        const browseBtn = document.getElementById('browse-json-btn');

        // Click to browse
        uploadZone.addEventListener('click', () => fileInput.click());
        browseBtn.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleJSONUpload(e.target.files[0]);
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
                this.handleJSONUpload(e.dataTransfer.files[0]);
            }
        });

        // Example items
        const exampleItems = document.querySelectorAll('.example-item');
        exampleItems.forEach(item => {
            item.addEventListener('click', () => {
                const example = item.dataset.example;
                this.loadExample(example);
            });
        });
    }

    async handleJSONUpload(file) {
        if (!file.name.endsWith('.json')) {
            window.showToast('Please upload a JSON file', 'error');
            return;
        }

        window.showLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload/json', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.diagram) {
                this.editor.loadDiagram(result.diagram);
                window.showToast(`Loaded: ${result.filename}`, 'success');
                
                // Navigate to export page to view diagram
                setTimeout(() => {
                    document.querySelector('[data-page="export"]').click();
                }, 500);
            } else {
                throw new Error(result.error || 'Failed to load diagram');
            }
        } catch (error) {
            console.error('JSON upload error:', error);
            window.showToast('Failed to load JSON file', 'error');
        } finally {
            window.showLoading(false);
        }
    }

    async loadExample(exampleName) {
        window.showToast(`Loading ${exampleName} example...`, 'info');
        
        // For now, create a simple example diagram
        // In a real implementation, you would load from example JSON files
        const exampleDiagram = this.createExampleDiagram(exampleName);
        
        this.editor.loadDiagram(exampleDiagram);
        
        setTimeout(() => {
            document.querySelector('[data-page="export"]').click();
        }, 500);
    }

    createExampleDiagram(exampleName) {
        // Create simple example diagrams
        const baseX = 200;
        const baseY = 200;
        const spacing = 250;

        switch(exampleName) {
            case 'aws':
                return {
                    nodes: [
                        {
                            id: 'api-gateway',
                            label: 'API Gateway',
                            icon: 'assets/icons/AWS/App-Integration/API-Gateway.svg',
                            type: 'api',
                            position: { x: baseX, y: baseY }
                        },
                        {
                            id: 'lambda',
                            label: 'Lambda Function',
                            icon: 'assets/icons/AWS/Compute/Lambda.svg',
                            type: 'compute',
                            position: { x: baseX + spacing, y: baseY }
                        },
                        {
                            id: 's3',
                            label: 'S3 Bucket',
                            icon: 'assets/icons/AWS/Storage/Simple-Storage-Service.svg',
                            type: 'storage',
                            position: { x: baseX + spacing * 2, y: baseY }
                        }
                    ],
                    edges: [
                        {
                            id: 'edge-1',
                            source: 'api-gateway',
                            target: 'lambda',
                            label: 'invoke',
                            type: 'orthogonal'
                        },
                        {
                            id: 'edge-2',
                            source: 'lambda',
                            target: 's3',
                            label: 'read/write',
                            type: 'orthogonal'
                        }
                    ],
                    metadata: {
                        title: 'AWS Example Architecture',
                        cloud_provider: 'AWS'
                    }
                };

            case 'azure':
                return {
                    nodes: [
                        {
                            id: 'app-service',
                            label: 'App Service',
                            icon: 'assets/icons/Azure/app services/App-Services.svg',
                            type: 'compute',
                            position: { x: baseX, y: baseY }
                        },
                        {
                            id: 'sql-db',
                            label: 'SQL Database',
                            icon: 'assets/icons/Azure/databases/SQL-Database.svg',
                            type: 'database',
                            position: { x: baseX + spacing, y: baseY + 100 }
                        },
                        {
                            id: 'storage',
                            label: 'Blob Storage',
                            icon: 'assets/icons/Azure/storage/Storage-Accounts.svg',
                            type: 'storage',
                            position: { x: baseX + spacing, y: baseY - 100 }
                        }
                    ],
                    edges: [
                        {
                            id: 'edge-1',
                            source: 'app-service',
                            target: 'sql-db',
                            label: 'query',
                            type: 'orthogonal'
                        },
                        {
                            id: 'edge-2',
                            source: 'app-service',
                            target: 'storage',
                            label: 'upload',
                            type: 'orthogonal'
                        }
                    ],
                    metadata: {
                        title: 'Azure Example Architecture',
                        cloud_provider: 'Azure'
                    }
                };

            case 'kubernetes':
                return {
                    nodes: [
                        {
                            id: 'ingress',
                            label: 'Ingress',
                            icon: 'assets/icons/Kubernetes/ing.svg',
                            type: 'networking',
                            position: { x: baseX, y: baseY }
                        },
                        {
                            id: 'service',
                            label: 'Service',
                            icon: 'assets/icons/Kubernetes/svc.svg',
                            type: 'networking',
                            position: { x: baseX + spacing, y: baseY }
                        },
                        {
                            id: 'pod',
                            label: 'Pod',
                            icon: 'assets/icons/Kubernetes/pod.svg',
                            type: 'compute',
                            position: { x: baseX + spacing * 2, y: baseY }
                        }
                    ],
                    edges: [
                        {
                            id: 'edge-1',
                            source: 'ingress',
                            target: 'service',
                            label: 'route',
                            type: 'orthogonal'
                        },
                        {
                            id: 'edge-2',
                            source: 'service',
                            target: 'pod',
                            label: 'forward',
                            type: 'orthogonal'
                        }
                    ],
                    metadata: {
                        title: 'Kubernetes Example',
                        cloud_provider: 'Kubernetes'
                    }
                };

            default:
                return {
                    nodes: [],
                    edges: [],
                    metadata: { title: 'Empty Diagram' }
                };
        }
    }
}
