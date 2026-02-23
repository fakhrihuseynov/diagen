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

    // Detect primary cloud provider from markdown
    const markdownLower = markdown.toLowerCase();
    let primaryProvider = 'General';
    if (markdownLower.includes('aws') || markdownLower.includes('amazon web services')) {
      primaryProvider = 'AWS';
    } else if (markdownLower.includes('azure') || markdownLower.includes('microsoft azure')) {
      primaryProvider = 'Azure';
    } else if (markdownLower.includes('gcp') || markdownLower.includes('google cloud')) {
      primaryProvider = 'GCP';
    } else if (markdownLower.includes('kubernetes') || markdownLower.includes('k8s')) {
      primaryProvider = 'Kubernetes';
    }

    // Extract provider-specific icons dynamically from tree.txt
    const providerIcons = extractProviderIcons(iconInventory, primaryProvider);
    const iconPathList = formatIconPaths(providerIcons, primaryProvider);

    const prompt = `You are a cloud architecture diagram generator. Generate a JSON diagram from the markdown below.

DETECTED CLOUD PROVIDER: ${primaryProvider}

AVAILABLE ICONS (EXACT PATHS - USE ONLY THESE):
${iconPathList}

CRITICAL INSTRUCTIONS:
1. ONLY use icon paths from the list above - these are the ONLY icons that exist
2. Match service names to icon filenames carefully:
   - Example: "S3" → use "Simple-Storage-Service.svg"
   - Example: "API Gateway" → use "API-Gateway.svg"  
   - Example: "Redis Cache" → use "Cache-Redis.svg"
   - Example: "SQL Database" → use "SQL-Database.svg"
   - Example: "Cosmos DB" → use "Azure-Cosmos-DB.svg"
   - Example: "Key Vault" → use "Key-Vaults.svg"
   - Example: "Front Door" → use "Front-Door-and-CDN-Profiles.svg"
3. Full path format: "assets/icons/${primaryProvider}/category-name/Icon-File-Name.svg"
4. Position nodes with 250-350px spacing for readability
5. All edges MUST use "orthogonal" type

MARKDOWN INPUT:
${markdown}

OUTPUT JSON FORMAT:
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Service Display Name",
      "icon": "assets/icons/${primaryProvider}/category/Exact-Icon-Filename.svg",
      "type": "service",
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-id",
      "target": "target-id", 
      "label": "connection type",
      "type": "orthogonal"
    }
  ],
  "metadata": {
    "title": "Architecture Diagram Title",
    "description": "Brief description",
    "cloud_provider": "${primaryProvider}"
  }
}

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown code blocks, just the JSON object.

Generate now:`;

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

// Helper function to extract provider-specific icons from tree.txt
function extractProviderIcons(treeContent, provider) {
  const icons = [];
  const lines = treeContent.split('\n');
  let inProviderSection = false;
  let currentCategory = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect provider section start: "│       ├── AWS"
    if (line.match(new RegExp(`│\\s+[├└]── ${provider}\\s*$`))) {
      inProviderSection = true;
      continue;
    }
    
    // Detect next provider section at same level (exit current)
    if (inProviderSection && line.match(/│\s+[├└]── (AWS|Azure|GCP|Kubernetes|General|Monitoring)\s*$/)) {
      const match = line.match(/│\s+[├└]── (AWS|Azure|GCP|Kubernetes|General|Monitoring)\s*$/);
      if (match && match[1] !== provider) {
        break;
      }
    }
    
    if (inProviderSection) {
      // Check if this is an icon file line first (more specific): "│       │   │   ├── Athena.svg"
      const iconMatch = line.match(/│\s+│\s+│\s+[├└]── (.+\.svg)\s*$/);
      if (iconMatch && currentCategory) {
        const iconFile = iconMatch[1].trim();
        icons.push({
          category: currentCategory,
          filename: iconFile
        });
        continue;
      }
      
      // Extract category (only if NOT an svg file): "│       │   ├── Analytics"
      const categoryMatch = line.match(/│\s+│\s+[├└]── ([^│\n]+)$/);
      if (categoryMatch && !categoryMatch[1].includes('.svg')) {
        currentCategory = categoryMatch[1].trim();
        continue;
      }
    }
  }
  
  console.log(`[Icon Extraction] Found ${icons.length} icons for ${provider}`);
  return icons;
}

// Helper function to format icon paths for AI prompt
function formatIconPaths(icons, provider) {
  if (icons.length === 0) {
    return 'No icons found for this provider';
  }
  
  let formatted = '';
  let currentCategory = '';
  
  icons.forEach(icon => {
    if (icon.category !== currentCategory) {
      currentCategory = icon.category;
      formatted += `\n${currentCategory}:\n`;
    }
    formatted += `  - assets/icons/${provider}/${icon.category}/${icon.filename}\n`;
  });
  
  return formatted;
}

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
