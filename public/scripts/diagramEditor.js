/**
 * Diagram Editor
 * Handles canvas rendering, element manipulation, and orthogonal connectors
 * Enhanced with pan/zoom, auto-fit, and visual grouping
 */

export class DiagramEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.nodes = [];
        this.edges = [];
        this.groups = []; // Visual frames for different stacks
        this.selectedNode = null;
        this.selectedEdge = null;
        this.isDragging = false;
        this.isDraggingEdge = false;
        this.isPanning = false;
        this.dragOffset = { x: 0, y: 0 };
        this.lastPanPoint = { x: 0, y: 0 };
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        this.dpr = window.devicePixelRatio || 1;
        
        this.gridSize = 20;
        this.iconCache = new Map();
        
        // Setup high-DPI canvas
        this.setupHighDPICanvas();
        this.setupEventListeners();
    }

    setupHighDPICanvas() {
        // Use canvas width/height attributes directly (getBoundingClientRect can return 0x0 if called too early)
        const width = this.canvas.width || 1600;
        const height = this.canvas.height || 1000;
        
        // Set actual size in memory (scaled for DPI)
        this.canvas.width = width * this.dpr;
        this.canvas.height = height * this.dpr;
        
        // Normalize coordinate system to use CSS pixels
        this.ctx.scale(this.dpr, this.dpr);
        
        // Set CSS size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // High-quality image smoothing
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        // Context menu
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // Keyboard events for panning
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        
        this.spacePressed = false;
    }

    onKeyDown(e) {
        if (e.code === 'Space' && !this.spacePressed) {
            this.spacePressed = true;
            this.canvas.style.cursor = 'grab';
            // Prevent default scroll behavior that causes drift
            if (document.activeElement === document.body || document.activeElement === this.canvas) {
                e.preventDefault();
            }
        }
    }

    onKeyUp(e) {
        if (e.code === 'Space') {
            this.spacePressed = false;
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Pan mode: Middle mouse button OR right click OR space + left click
        if (e.button === 1 || e.button === 2 || (this.spacePressed && e.button === 0)) {
            this.isPanning = true;
            this.lastPanPoint = { x: screenX, y: screenY };
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }
        
        // Get world coordinates
        const x = screenX / this.scale - this.panOffset.x;
        const y = screenY / this.scale - this.panOffset.y;

        // Edge control points disabled per user request
        // Users don't want curved lines with control points

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
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Handle panning
        if (this.isPanning) {
            const dx = (screenX - this.lastPanPoint.x) / this.scale;
            const dy = (screenY - this.lastPanPoint.y) / this.scale;
            
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            
            this.lastPanPoint = { x: screenX, y: screenY };
            this.render();
            return;
        }
        
        // Edge dragging disabled - users don't want curve control points
        
        // Handle node dragging
        if (this.isDragging && this.selectedNode) {
            const x = screenX / this.scale - this.panOffset.x;
            const y = screenY / this.scale - this.panOffset.y;

            // Snap to grid
            this.selectedNode.position.x = Math.round((x - this.dragOffset.x) / this.gridSize) * this.gridSize;
            this.selectedNode.position.y = Math.round((y - this.dragOffset.y) / this.gridSize) * this.gridSize;

            this.render();
        }
        
        // Update cursor for edge hovering
        if (!this.isDragging && !this.isPanning && !this.isDraggingEdge) {
            const x = screenX / this.scale - this.panOffset.x;
            const y = screenY / this.scale - this.panOffset.y;
            const edge = this.getEdgeAt(x, y);
            this.canvas.style.cursor = edge ? 'move' : 'default';
        }
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.spacePressed ? 'grab' : 'default';
        }
        this.isDragging = false;
        this.isDraggingEdge = false;
        this.selectedNode = null;
        this.selectedEdge = null;
        this.canvas.style.cursor = 'default';
    }

    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Get world position before zoom
        const worldX = mouseX / this.scale - this.panOffset.x;
        const worldY = mouseY / this.scale - this.panOffset.y;
        
        // Apply zoom
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = Math.max(0.5, Math.min(2, this.scale + delta));
        
        // Calculate new pan offset to keep world position under mouse
        this.panOffset.x = mouseX / newScale - worldX;
        this.panOffset.y = mouseY / newScale - worldY;
        
        this.scale = newScale;
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

    getEdgeAt(x, y) {
        // Edge control points disabled per user request
        // Users prefer straight lines without curve manipulation
        return null;
    }

    getNodeAt(x, y) {
        // Check from top to bottom (reverse order)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const nodeSize = 70;
            
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

        console.log('Loading diagram with', diagram.nodes.length, 'nodes and', (diagram.edges?.length || 0), 'edges');
        
        this.nodes = diagram.nodes || [];
        this.edges = diagram.edges || [];
        
        // Load icons for nodes
        this.nodes.forEach(node => {
            if (node.icon) {
                this.loadIcon(node.icon);
            }
        });
        
        // First render to show something immediately
        this.render();
        
        // Auto-fit diagram to canvas after icons have time to load
        setTimeout(() => {
            console.log('Auto-fitting diagram to canvas');
            this.fitDiagramToCanvas();
        }, 200); // Increased delay for icon loading
        
        window.showToast('Diagram loaded successfully', 'success');
    }

    fitDiagramToCanvas() {
        if (this.nodes.length === 0) {
            console.log('No nodes to fit');
            this.render();
            return;
        }
        
        // Calculate bounds of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            const nodeSize = 70;
            minX = Math.min(minX, node.position.x - nodeSize / 2);
            minY = Math.min(minY, node.position.y - nodeSize / 2);
            maxX = Math.max(maxX, node.position.x + nodeSize / 2);
            maxY = Math.max(maxY, node.position.y + nodeSize / 2);
        });
        
        const diagramWidth = maxX - minX;
        const diagramHeight = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Use CSS dimensions (not scaled canvas dimensions)
        const rect = this.canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;
        
        console.log('Fit calculations:', {
            diagramBounds: { minX, minY, maxX, maxY },
            diagramSize: { width: diagramWidth, height: diagramHeight },
            canvasSize: { width: canvasWidth, height: canvasHeight }
        });
        
        // Calculate scale to fit with padding
        const paddingFactor = 0.85; // Use 85% of canvas space
        const scaleX = (canvasWidth * paddingFactor) / diagramWidth;
        const scaleY = (canvasHeight * paddingFactor) / diagramHeight;
        this.scale = Math.min(scaleX, scaleY, 2); // Max 2x zoom
        
        // Clamp scale to reasonable bounds
        this.scale = Math.max(0.5, Math.min(2, this.scale));
        
        // Center diagram in viewport
        this.panOffset.x = (canvasWidth / this.scale) / 2 - centerX;
        this.panOffset.y = (canvasHeight / this.scale) / 2 - centerY;
        
        console.log('Applied scale:', this.scale, 'panOffset:', this.panOffset);
        
        this.render();
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
        // Get CSS dimensions for clearing
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        
        // Draw grid
        this.drawGrid();
        
        // Draw stack frames/groups (with error handling)
        try {
            this.drawStackFrames();
        } catch (e) {
            console.warn('Error drawing stack frames:', e);
        }
        
        // Draw edges
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

    drawStackFrames() {
        const stacks = this.detectStacks();
        
        stacks.forEach(stack => {
            const { name, nodes, color } = stack;
            
            if (nodes.length < 2) return; // Skip single-node stacks
            
            // Calculate bounding box with padding
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(node => {
                const size = 70;
                minX = Math.min(minX, node.position.x - size / 2);
                minY = Math.min(minY, node.position.y - size / 2);
                maxX = Math.max(maxX, node.position.x + size / 2);
                maxY = Math.max(maxY, node.position.y + size / 2);
            });
            
            const padding = 40;
            minX -= padding;
            minY -= padding;
            maxX += padding;
            maxY += padding;
            
            // Draw rounded rectangle frame
            const radius = 10;
            this.ctx.save();
            
            // Background with transparency
            this.ctx.fillStyle = color + '15'; // 15 = ~8% opacity in hex
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 4]); // Dashed border
            
            // Rounded rectangle path
            this.ctx.beginPath();
            this.ctx.moveTo(minX + radius, minY);
            this.ctx.lineTo(maxX - radius, minY);
            this.ctx.arcTo(maxX, minY, maxX, minY + radius, radius);
            this.ctx.lineTo(maxX, maxY - radius);
            this.ctx.arcTo(maxX, maxY, maxX - radius, maxY, radius);
            this.ctx.lineTo(minX + radius, maxY);
            this.ctx.arcTo(minX, maxY, minX, maxY - radius, radius);
            this.ctx.lineTo(minX, minY + radius);
            this.ctx.arcTo(minX, minY, minX + radius, minY, radius);
            this.ctx.closePath();
            
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset dash
            
            // Draw label
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(name, minX + 15, minY - 10);
            
            this.ctx.restore();
        });
    }

    detectStacks() {
        const stacks = [];
        
        if (!this.nodes || this.nodes.length === 0) {
            return stacks;
        }
        
        // Kubernetes/Container stack
        const k8sNodes = this.nodes.filter(n => {
            if (!n) return false;
            return (n.icon && (n.icon.includes('Kubernetes') || n.icon.includes('EKS') || n.icon.includes('AKS') || n.icon.includes('GKE'))) ||
                   (n.label && String(n.label).match(/kubernetes|k8s|cluster|pod|deployment/i));
        });
        if (k8sNodes.length > 0) {
            stacks.push({ name: '☸️ Kubernetes Cluster', nodes: k8sNodes, color: '#326CE5' });
        }
        
        // Monitoring stack
        const monitorNodes = this.nodes.filter(n => {
            if (!n) return false;
            return (n.icon && (n.icon.includes('Monitoring') || n.icon.includes('CloudWatch') || n.icon.includes('Monitor'))) ||
                   (n.label && String(n.label).match(/prometheus|grafana|cloudwatch|monitor|metrics|logs|datadog/i));
        });
        if (monitorNodes.length > 0) {
            stacks.push({ name: '📊 Monitoring Stack', nodes: monitorNodes, color: '#FF6B35' });
        }
        
        // Database stack
        const dbNodes = this.nodes.filter(n => {
            if (!n) return false;
            return (n.icon && (n.icon.includes('Database') || n.icon.includes('RDS') || n.icon.includes('PostgreSQL') || n.icon.includes('MySQL') || n.icon.includes('Redis'))) ||
                   (n.label && String(n.label).match(/database|postgres|mysql|redis|rds|dynamodb|mongo/i));
        });
        if (dbNodes.length > 0) {
            stacks.push({ name: '🗄️ Data Layer', nodes: dbNodes, color: '#4CAF50' });
        }
        
        // Storage stack
        const storageNodes = this.nodes.filter(n => {
            if (!n) return false;
            return (n.icon && (n.icon.includes('Storage') || n.icon.includes('S3') || n.icon.includes('Blob'))) ||
                   (n.label && String(n.label).match(/storage|s3|blob|bucket|volume/i));
        });
        if (storageNodes.length > 0) {
            stacks.push({ name: '💾 Storage Layer', nodes: storageNodes, color: '#9C27B0' });
        }
        
        // Networking stack
        const networkNodes = this.nodes.filter(n => {
            if (!n) return false;
            return (n.icon && (n.icon.includes('Networking') || n.icon.includes('Gateway') || n.icon.includes('LoadBalancer') || n.icon.includes('VPC'))) ||
                   (n.label && String(n.label).match(/gateway|load.?balancer|vpc|network|ingress|alb|nlb/i));
        });
        if (networkNodes.length > 0) {
            stacks.push({ name: '🌐 Network Layer', nodes: networkNodes, color: '#0EA5E9' });
        }
        
        return stacks;
    }

    drawNode(node) {
        const size = 70; // Increased to fit 64px icons
        const x = node.position.x;
        const y = node.position.y;
        
        // Draw node background with subtle shadow
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = this.selectedNode === node ? '#4F46E5' : '#E2E8F0';
        this.ctx.lineWidth = this.selectedNode === node ? 3 : 1.5;
        
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
        this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        
        // Draw icon if available with maximum quality
        if (node.icon && this.iconCache.has(node.icon)) {
            const img = this.iconCache.get(node.icon);
            if (img.complete && img.width > 0) {
                // Save context state
                this.ctx.save();
                
                // Disable smoothing for pixel-perfect SVG rendering
                this.ctx.imageSmoothingEnabled = false;
                
                // Draw at larger size for better clarity
                const iconSize = 64; // Increased to 64px
                const iconX = x - iconSize/2;
                const iconY = y - iconSize/2;
                
                // Draw the icon
                this.ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
                
                // Restore context
                this.ctx.restore();
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
        
        // Clean, thin line styling
        const isSelected = this.selectedEdge === edge;
        this.ctx.strokeStyle = isSelected ? '#4F46E5' : '#475569';
        this.ctx.lineWidth = isSelected ? 2 : 1.5;
        this.ctx.lineCap = 'butt';
        this.ctx.lineJoin = 'miter';
        this.ctx.setLineDash([]);
        
        // No shadow for crisp lines
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Always use straight or orthogonal paths (no curves)
        if (edge.type === 'orthogonal') {
            this.drawOrthogonalEdge(start, end);
        } else {
            this.drawStraightEdge(start, end);
        }
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw arrow at end
        this.drawArrow(end, start, null);
        
        // No control points - users prefer straight lines
        
        // Draw label if exists (skip "connection" labels)
        if (edge.label && edge.label.toLowerCase() !== 'connection') {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.strokeStyle = '#E2E8F0';
            this.ctx.lineWidth = 1;
            const padding = 8;
            const textWidth = this.ctx.measureText(edge.label).width;
            this.ctx.fillRect(midX - textWidth/2 - padding, midY - 12, textWidth + padding*2, 20);
            this.ctx.strokeRect(midX - textWidth/2 - padding, midY - 12, textWidth + padding*2, 20);
            
            this.ctx.fillStyle = '#475569';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(edge.label, midX, midY + 2);
        }
    }

    drawCurvedEdge(start, end, control) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        this.ctx.stroke();
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

    drawArrow(end, start, control) {
        // Calculate arrow direction
        let angle;
        if (control) {
            // Calculate angle from control point to end
            angle = Math.atan2(end.y - control.y, end.x - control.x);
        } else {
            // Calculate angle from start to end
            angle = Math.atan2(end.y - start.y, end.x - start.x);
        }
        
        const size = 10;
        const width = 6;
        
        this.ctx.save();
        this.ctx.translate(end.x, end.y);
        this.ctx.rotate(angle);
        
        // Draw arrow head
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -width);
        this.ctx.lineTo(-size, width);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
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
