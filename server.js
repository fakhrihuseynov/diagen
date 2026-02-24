const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { 
  generateDiagramPrompt, 
  validateAndFixPaths, 
  correctIconPaths, 
  findCorrectIconPath,
  formatIconPaths,
  detectProviders,
  checkForCommonFakePaths,
  extractProviderIcons
} = require('./ai-instruct');
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

// Serve icon database
app.get('/icon-database.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'icon-database.json'));
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
    const { markdown, model = 'qwen2.5-coder:7b', explicitProviders = [] } = req.body;

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

    // Detect providers using AI module
    const detectedProviders = detectProviders(markdown, explicitProviders);

    // Extract icons from ALL detected providers and merge them
    let allProviderIcons = [];
    detectedProviders.forEach(provider => {
      const icons = extractProviderIcons(iconInventory, provider, __dirname);
      allProviderIcons = allProviderIcons.concat(icons);
    });
    
    // ALWAYS include General icons as fallback (unless already included)
    if (!detectedProviders.includes('General')) {
      const generalIcons = extractProviderIcons(iconInventory, 'General', __dirname);
      allProviderIcons = allProviderIcons.concat(generalIcons);
      console.log(`[Fallback] Added ${generalIcons.length} General icons as fallback`);
    }
    
    console.log(`[Icon Inventory] Total icons available: ${allProviderIcons.length}`);
    
    const iconPathList = formatIconPaths(allProviderIcons, detectedProviders);

    // Generate AI prompt using separated instruction module
    const prompt = generateDiagramPrompt(markdown, detectedProviders, iconPathList);

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
      { timeout: 300000 } // 5 minute timeout
    );

    let generatedText = ollamaResponse.data.response;
    
    // Extract JSON from response (in case model adds extra text)
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      generatedText = jsonMatch[0];
    }

    const diagram = JSON.parse(generatedText);

    // PRE-VALIDATION: Check for common fake paths
    const preValidation = checkForCommonFakePaths(diagram);
    if (!preValidation.valid) {
      console.warn('⚠️ AI generated known fake paths, forcing corrections...');
    }

    // AGGRESSIVE VALIDATION: Verify all paths exist, force corrections
    const validatedDiagram = validateAndFixPaths(diagram, allProviderIcons, __dirname);

    res.json({
      success: true,
      diagram: validatedDiagram,
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
  ║   Diagen - AI Architecture Diagram Generator          ║
  ║                                                       ║
  ║   Server running on: http://localhost:${PORT}         ║
  ║   Ollama URL: ${OLLAMA_URL}                    ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
