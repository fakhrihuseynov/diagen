/**
 * Diagram Editor
 * Handles canvas rendering, element manipulation, and orthogonal connectors
 */

export class DiagramEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        
        this.gridSize = 20;
        this.iconCache = new Map();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Context menu
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
        const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;

        // Check if clicking on a node
        const clickedNode = this.getNodeAt(x, y);
        
        if (clickedNode) {
            this.selectedNode = clickedNode;
            this.isDragging = true;
            this.dragOffset = {
                x: x - clickedNode.position.x,
                y: y - clickedNode.position.y
            };
        }
    }

    onMouseMove(e) {
        if (this.isDragging && this.selectedNode) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
            const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;

            // Snap to grid
            this.selectedNode.position.x = Math.round((x - this.dragOffset.x) / this.gridSize) * this.gridSize;
            this.selectedNode.position.y = Math.round((y - this.dragOffset.y) / this.gridSize) * this.gridSize;

            this.render();
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.selectedNode = null;
    }

    onWheel(e) {
        e.preventDefault();
        
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        
        this.scale = Math.max(0.5, Math.min(2, this.scale + delta));
        this.render();
    }

    onContextMenu(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
        const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;

        const clickedNode = this.getNodeAt(x, y);
        
        if (clickedNode) {
            this.showNodeContextMenu(clickedNode, e.clientX, e.clientY);
        }
    }

    getNodeAt(x, y) {
        // Check from top to bottom (reverse order)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const nodeSize = 60;
            
            if (x >= node.position.x - nodeSize / 2 &&
                x <= node.position.x + nodeSize / 2 &&
                y >= node.position.y - nodeSize / 2 &&
                y <= node.position.y + nodeSize / 2) {
                return node;
            }
        }
        return null;
    }

    showNodeContextMenu(node, x, y) {
        // Simple context menu for demonstration
        const remove = confirm(`Remove "${node.label}"?`);
        if (remove) {
            this.removeNode(node.id);
        }
    }

    // Diagram Management
    loadDiagram(diagram) {
        if (!diagram || !diagram.nodes) {
            console.error('Invalid diagram format');
            return;
        }

        this.nodes = diagram.nodes || [];
        this.edges = diagram.edges || [];
        
        // Load icons for nodes
        this.nodes.forEach(node => {
            if (node.icon) {
                this.loadIcon(node.icon);
            }
        });
        
        this.render();
        window.showToast('Diagram loaded successfully', 'success');
    }

    clearDiagram() {
        this.nodes = [];
        this.edges = [];
        this.render();
    }

    getDiagram() {
        return {
            nodes: this.nodes,
            edges: this.edges,
            metadata: {
                created: new Date().toISOString(),
                version: '1.0'
            }
        };
    }

    addNode(node) {
        if (!node.id) {
            node.id = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        
        if (!node.position) {
            node.position = {
                x: Math.random() * 800 + 100,
                y: Math.random() * 600 + 100
            };
        }
        
        this.nodes.push(node);
        
        if (node.icon) {
            this.loadIcon(node.icon);
        }
        
        this.render();
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        this.render();
    }

    addEdge(edge) {
        if (!edge.id) {
            edge.id = 'edge-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        
        if (!edge.type) {
            edge.type = 'orthogonal';
        }
        
        this.edges.push(edge);
        this.render();
    }

    // Rendering
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        
        // Draw grid
        this.drawGrid();
        
        // Draw edges first
        this.edges.forEach(edge => this.drawEdge(edge));
        
        // Draw nodes
        this.nodes.forEach(node => this.drawNode(node));
        
        this.ctx.restore();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#E5E7EB';
        this.ctx.lineWidth = 0.5;
        
        const startX = Math.floor((-this.panOffset.x) / this.gridSize) * this.gridSize;
        const startY = Math.floor((-this.panOffset.y) / this.gridSize) * this.gridSize;
        const endX = startX + this.canvas.width / this.scale;
        const endY = startY + this.canvas.height / this.scale;
        
        // Vertical lines
        for (let x = startX; x < endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y < endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    drawNode(node) {
        const size = 60;
        const x = node.position.x;
        const y = node.position.y;
        
        // Draw node background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = this.selectedNode === node ? '#4F46E5' : '#E2E8F0';
        this.ctx.lineWidth = this.selectedNode === node ? 3 : 2;
        
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
        this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        
        // Draw icon if available
        if (node.icon && this.iconCache.has(node.icon)) {
            const img = this.iconCache.get(node.icon);
            if (img.complete) {
                this.ctx.drawImage(img, x - 24, y - 24, 48, 48);
            }
        } else {
            // Draw placeholder
            this.ctx.fillStyle = '#9CA3AF';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('?', x, y + 4);
        }
        
        // Draw label
        this.ctx.fillStyle = '#1E293B';
        this.ctx.font = '12px -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        
        const label = node.label || 'Node';
        const maxWidth = 100;
        const words = label.split(' ');
        let line = '';
        let lineY = y + size / 2 + 15;
        
        words.forEach((word, i) => {
            const testLine = line + word + ' ';
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                this.ctx.fillText(line.trim(), x, lineY);
                line = word + ' ';
                lineY += 14;
            } else {
                line = testLine;
            }
        });
        this.ctx.fillText(line.trim(), x, lineY);
    }

    drawEdge(edge) {
        const sourceNode = this.nodes.find(n => n.id === edge.source);
        const targetNode = this.nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return;
        
        const start = sourceNode.position;
        const end = targetNode.position;
        
        this.ctx.strokeStyle = '#64748B';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        
        if (edge.type === 'orthogonal') {
            this.drawOrthogonalEdge(start, end);
        } else {
            this.drawStraightEdge(start, end);
        }
        
        // Draw arrow
        this.drawArrow(end.x, end.y);
        
        // Draw label if exists
        if (edge.label) {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(midX - 30, midY - 10, 60, 20);
            
            this.ctx.fillStyle = '#475569';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(edge.label, midX, midY + 4);
        }
    }

    drawOrthogonalEdge(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        
        // Calculate midpoint for orthogonal routing
        const midX = (start.x + end.x) / 2;
        
        // Draw L-shape or Z-shape path
        if (Math.abs(start.y - end.y) < 50) {
            // Horizontal line with slight vertical offset
            this.ctx.lineTo(midX, start.y);
            this.ctx.lineTo(midX, end.y);
        } else {
            // Standard L or Z shape
            this.ctx.lineTo(midX, start.y);
            this.ctx.lineTo(midX, end.y);
        }
        
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }

    drawStraightEdge(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }

    drawArrow(x, y) {
        const size = 8;
        this.ctx.fillStyle = '#64748B';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - size, y - size);
        this.ctx.lineTo(x - size, y + size);
        this.ctx.closePath();
        this.ctx.fill();
    }

    async loadIcon(iconPath) {
        if (this.iconCache.has(iconPath)) {
            return this.iconCache.get(iconPath);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.iconCache.set(iconPath, img);
                this.render();
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load icon: ${iconPath}`);
                reject();
            };
            img.src = '/' + iconPath;
        });
    }

    // Export as data URL for PNG export
    toDataURL() {
        return this.canvas.toDataURL('image/png');
    }
}
