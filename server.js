const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/examples', express.static('examples'));

// Ensure upload and export directories exist
const ensureDirectories = () => {
  const dirs = ['uploads', 'exports'];
  dirs.forEach(dir => {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  });
};
ensureDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.md', '.json', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .md, .json, and .txt files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check Ollama connection and list models
app.get('/api/ollama/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = response.data.models || [];
    res.json({ 
      success: true, 
      models: models.map(m => ({ name: m.name, size: m.size, modified: m.modified_at })) 
    });
  } catch (error) {
    console.error('Ollama connection error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Cannot connect to Ollama. Make sure Ollama is running on ' + OLLAMA_URL 
    });
  }
});

// Upload markdown file
app.post('/api/upload/markdown', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const content = await fs.readFile(req.file.path, 'utf-8');
    
    res.json({
      success: true,
      filename: req.file.originalname,
      content: content,
      path: req.file.path
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload JSON diagram file
app.post('/api/upload/json', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const content = await fs.readFile(req.file.path, 'utf-8');
    const diagram = JSON.parse(content);
    
    res.json({
      success: true,
      filename: req.file.originalname,
      diagram: diagram
    });
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({ success: false, error: 'Invalid JSON file' });
  }
});

// Generate diagram from markdown using Ollama
app.post('/api/generate', async (req, res) => {
  try {
    const { markdown, model = 'qwen2.5-coder:7b' } = req.body;

    if (!markdown) {
      return res.status(400).json({ success: false, error: 'Markdown content is required' });
    }

    // Read icon inventory from tree.txt
    let iconInventory = '';
    try {
      iconInventory = await fs.readFile('tree.txt', 'utf-8');
    } catch (err) {
      console.warn('Could not read tree.txt, proceeding without icon inventory');
    }

    const prompt = `You are a cloud architecture diagram generator. Analyze the following markdown description and generate a JSON representation of the diagram.

AVAILABLE ICONS (from tree.txt):
${iconInventory.substring(0, 5000)} // Truncated for performance

MARKDOWN INPUT:
${markdown}

INSTRUCTIONS:
1. Identify all components, services, and resources mentioned in the markdown
2. Map each component to an appropriate icon from the available icons (AWS, Azure, GCP, Kubernetes, General, Monitoring)
3. Determine the relationships and connections between components
4. Generate a JSON structure with the following format:

{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Service Name",
      "icon": "path/to/icon.svg",
      "type": "service-type",
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "connection description",
      "type": "orthogonal"
    }
  ],
  "metadata": {
    "title": "Diagram Title",
    "description": "Brief description",
    "cloud_provider": "AWS|Azure|GCP|Multi-Cloud|Kubernetes"
  }
}

IMPORTANT:
- Use ONLY icons that exist in the tree.txt file
- Position nodes in a logical layout (spread them out, typical spacing: 200-300px)
- All edges must use "orthogonal" type for right-angle connectors
- Icon paths should be relative: "assets/icons/AWS/Compute/Lambda.svg"
- Make the diagram visually balanced and easy to read

Return ONLY valid JSON, no explanations or markdown formatting.`;

    // Call Ollama API
    const ollamaResponse = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 4096
        }
      },
      { timeout: 120000 } // 2 minute timeout
    );

    let generatedText = ollamaResponse.data.response;
    
    // Extract JSON from response (in case model adds extra text)
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      generatedText = jsonMatch[0];
    }

    const diagram = JSON.parse(generatedText);

    res.json({
      success: true,
      diagram: diagram,
      model: model
    });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'Error generating diagram'
    });
  }
});

// Get icon list
app.get('/api/icons', async (req, res) => {
  try {
    const iconsDir = path.join(__dirname, 'assets', 'icons');
    const iconTree = await buildIconTree(iconsDir);
    res.json({ success: true, icons: iconTree });
  } catch (error) {
    console.error('Error reading icons:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to build icon tree
async function buildIconTree(dir, relativePath = '') {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const tree = [];

  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    const relPath = path.join(relativePath, item.name);

    if (item.isDirectory()) {
      const children = await buildIconTree(itemPath, relPath);
      tree.push({
        name: item.name,
        type: 'directory',
        path: relPath,
        children: children
      });
    } else if (item.name.endsWith('.svg') || item.name.endsWith('.png')) {
      tree.push({
        name: item.name,
        type: 'icon',
        path: 'assets/icons/' + relPath.replace(/\\/g, '/')
      });
    }
  }

  return tree;
}

// Save diagram
app.post('/api/save', async (req, res) => {
  try {
    const { diagram, filename } = req.body;
    
    if (!diagram || !filename) {
      return res.status(400).json({ success: false, error: 'Diagram and filename required' });
    }

    const sanitizedFilename = filename.replace(/[^a-z0-9-_]/gi, '_') + '.json';
    const filepath = path.join('exports', sanitizedFilename);
    
    await fs.writeFile(filepath, JSON.stringify(diagram, null, 2));
    
    res.json({
      success: true,
      filepath: filepath,
      filename: sanitizedFilename
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   Diagen - AI Architecture Diagram Generator         ║
  ║                                                       ║
  ║   Server running on: http://localhost:${PORT}       ║
  ║   Ollama URL: ${OLLAMA_URL}                          ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
