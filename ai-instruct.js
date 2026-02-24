/**
 * AI Instruction Generator & Path Validator
 * Separates all AI-related logic from server.js
 */

const path = require('path');
const fs = require('fs');

// EXTRACT ICONS FROM TREE.TXT - Parse tree.txt to get available icons
function extractProviderIcons(treeContent, provider, projectRoot) {
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
      // Check if this is a category-based icon (3 pipes = nested structure): "│   │   │   ├── Athena.svg"
      const deepIconMatch = line.match(/│\s+│\s+│\s+[├└]── (.+\.svg)\s*$/);
      if (deepIconMatch && currentCategory) {
        const iconFile = deepIconMatch[1].trim();
        icons.push({
          provider: provider,
          category: currentCategory,
          filename: iconFile,
          fullPath: `assets/icons/${provider}/${currentCategory}/${iconFile}`
        });
        continue;
      }
      
      // Check for flat icon (no category) - ONLY 2 pipes: "│   │   ├── api.svg" (Kubernetes/Monitoring)
      const flatIconMatch = line.match(/^│\s+│\s+[├└]── (.+\.svg)\s*$/);
      if (flatIconMatch) {
        const iconFile = flatIconMatch[1].trim();
        const categoryName = currentCategory || 'General-Icons';
        icons.push({
          provider: provider,
          category: categoryName,
          filename: iconFile,
          fullPath: `assets/icons/${provider}/${iconFile}`
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
  
  console.log(`[Icon Extraction] Found ${icons.length} icons for ${provider} from tree.txt`);
  
  // FALLBACK: For General provider, also scan filesystem to catch any icons not in tree.txt
  if (provider === 'General' && projectRoot) {
    try {
      const generalPath = path.join(projectRoot, 'assets', 'icons', 'General');
      const filesOnDisk = fs.readdirSync(generalPath);
      const svgFiles = filesOnDisk.filter(f => f.endsWith('.svg'));
      
      // Add any icons from filesystem that weren't in tree.txt
      const existingFilenames = new Set(icons.map(i => i.filename));
      let addedCount = 0;
      
      svgFiles.forEach(filename => {
        if (!existingFilenames.has(filename)) {
          icons.push({
            provider: 'General',
            category: 'General-Icons',
            filename: filename,
            fullPath: `assets/icons/General/${filename}`
          });
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        console.log(`[Filesystem Fallback] Added ${addedCount} additional General icons from disk`);
      }
    } catch (err) {
      console.warn(`[Filesystem Fallback] Could not scan General directory: ${err.message}`);
    }
  }
  
  return icons;
}

// PROVIDER DETECTION - Auto-detect cloud providers from markdown
function detectProviders(markdown, explicitProviders = []) {
  let detectedProviders = [];
  
  if (explicitProviders && explicitProviders.length > 0) {
    // User explicitly selected providers - use those
    detectedProviders = explicitProviders;
    console.log(`[Provider Selection] User selected: ${detectedProviders.join(', ')}`);
  } else {
    // Auto-detect ALL cloud providers/technologies from markdown
    const markdownLower = markdown.toLowerCase();
    
    if (markdownLower.includes('aws') || markdownLower.includes('amazon web services')) {
      detectedProviders.push('AWS');
    }
    if (markdownLower.includes('azure') || markdownLower.includes('microsoft azure')) {
      detectedProviders.push('Azure');
    }
    if (markdownLower.includes('gcp') || markdownLower.includes('google cloud')) {
      detectedProviders.push('GCP');
    }
    if (markdownLower.includes('kubernetes') || markdownLower.includes('k8s')) {
      detectedProviders.push('Kubernetes');
    }
    if (markdownLower.includes('prometheus') || markdownLower.includes('grafana') || 
        markdownLower.includes('datadog') || markdownLower.includes('cloudwatch') ||
        markdownLower.includes('monitoring')) {
      detectedProviders.push('Monitoring');
    }
    
    // If no specific providers detected, use General
    if (detectedProviders.length === 0) {
      detectedProviders.push('General');
    }
    
    console.log(`[Provider Detection] Auto-detected: ${detectedProviders.join(', ')}`);
  }
  
  console.log(`[Provider Detection] Found: ${detectedProviders.join(', ')}`);
  return detectedProviders;
}

// AI PROMPT GENERATOR - ULTRA SIMPLIFIED
function generateDiagramPrompt(markdown, detectedProviders, iconPathList) {
  // Load icon database for strict reference
  const iconDb = require('./icon-database.json');
  const totalIcons = Object.keys(iconDb).length;
  
  return `You are a cloud architecture diagram generator. Generate a JSON diagram from the markdown below.

DETECTED TECHNOLOGIES: ${detectedProviders.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 AVAILABLE ICONS - USE THESE EXACT PATHS 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Below is the COMPLETE list of available icons. You MUST use these EXACT paths.
DO NOT make up icon paths - only use paths from this list.

${iconPathList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 ICON SELECTION RULES 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOR EACH SERVICE:
1. Look for keywords in the service name (e.g., "blob", "storage", "database")
2. Find matching icon from the list above
3. Copy the EXACT path shown

EXAMPLES:
- "Azure Blob Storage" → search for "storage" or "blob" → use: "assets/icons/Azure/storage/Storage-Accounts.svg"
- "S3" → search for "s3" → use: "assets/icons/AWS/Storage/S3-bucket.svg" 
- "EKS" → search for "eks" → use: "assets/icons/AWS/Containers/EKS-Cloud.svg"
- "PostgreSQL" → search for "postgres" → use matching postgres icon from list

🚫 NEVER CREATE PATHS - ONLY USE PATHS FROM THE LIST ABOVE!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MARKDOWN INPUT:
${markdown}

LAYOUT REQUIREMENTS:
- Space nodes at least 250-300 pixels apart horizontally
- Space nodes at least 200-250 pixels apart vertically
- Use wider spacing for better readability
- Example positions: {"x": 200, "y": 200}, {"x": 500, "y": 200}, {"x": 800, "y": 200}
- Avoid clustering nodes too close together

OUTPUT JSON FORMAT:
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Service Name",
      "icon": "EXACT_PATH_FROM_DATABASE",
      "type": "service",
      "position": {"x": 200, "y": 200}
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-id",
      "target": "target-id",
      "label": "connection",
      "type": "orthogonal"
    }
  ],
  "metadata": {
    "title": "Diagram Title",
    "description": "Description",
    "technologies": "${detectedProviders.join(', ')}"
  }
}

Return ONLY valid JSON. No markdown, no explanations.`;
}

// PRE-VALIDATION: Check if ALL paths exist in icon-database.json
function checkForCommonFakePaths(diagram) {
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return { valid: true, errors: [] };
  }

  // Load icon database
  const iconDatabase = require('./icon-database.json');
  const validPaths = new Set();
  
  for (const iconArray of Object.values(iconDatabase)) {
    iconArray.forEach(icon => {
      validPaths.add(icon.exactPath.toLowerCase());
    });
  }

  const errors = [];
  
  diagram.nodes.forEach((node, idx) => {
    if (!node.icon) return;
    
    const lowerPath = node.icon.toLowerCase();
    
    // Check if path exists in database
    if (!validPaths.has(lowerPath)) {
      errors.push(`Node ${idx} (${node.label || 'unnamed'}): Path not in icon database: "${node.icon}"`);
    }
  });

  if (errors.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⛔️ PATHS NOT IN ICON DATABASE');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// STRICT PATH VALIDATOR: Uses icon-database.json as source of truth
function validateAndFixPaths(diagram, providerIcons, projectRoot) {
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return diagram;
  }

  // Load icon database - THIS IS THE ONLY SOURCE OF TRUTH
  const iconDatabase = require('./icon-database.json');
  
  // Build reverse lookup: exactPath -> icon entry
  const pathLookup = new Map();
  const searchLookup = new Map(); // normalized name -> exactPath
  
  for (const [normalizedKey, iconArray] of Object.entries(iconDatabase)) {
    iconArray.forEach(icon => {
      pathLookup.set(icon.exactPath.toLowerCase(), icon.exactPath);
      searchLookup.set(normalizedKey, icon.exactPath);
      
      // Also index by filename variations
      const filename = icon.filename.replace('.svg', '').toLowerCase();
      const filenameNormalized = filename.replace(/[^a-z0-9]/g, '');
      if (!searchLookup.has(filenameNormalized)) {
        searchLookup.set(filenameNormalized, icon.exactPath);
      }
    });
  }

  console.log(`[JSON Validator] Loaded ${pathLookup.size} icon paths from database`);

  let fixedCount = 0;
  let invalidCount = 0;
  
  diagram.nodes.forEach((node, idx) => {
    if (!node.icon) return;
    
    const originalPath = node.icon;
    const lowerPath = originalPath.toLowerCase();
    
    // Check if path exists in database (exact match)
    if (pathLookup.has(lowerPath)) {
      const correctPath = pathLookup.get(lowerPath);
      if (correctPath !== originalPath) {
        node.icon = correctPath;
        console.log(`[JSON Validator] Fixed case: ${originalPath} → ${correctPath}`);
        fixedCount++;
      } else {
        console.log(`[JSON Validator] ✓ Valid: ${originalPath}`);
      }
      return;
    }
    
    // Path not in database - try to fix
    invalidCount++;
    console.error(`[JSON Validator] ✗ INVALID (not in database): ${originalPath}`);
    
    // Extract what the AI was trying to reference
    const filename = originalPath.split('/').pop();
    let normalized = filename.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Remove common prefixes that AI adds
    normalized = normalized.replace(/^amazon/, '').replace(/^aws/, '').replace(/^azure/, '').replace(/^google/, '').replace(/^gcp/, '');
    
    // Try exact normalized match
    if (searchLookup.has(normalized)) {
      node.icon = searchLookup.get(normalized);
      console.log(`[JSON Validator] → Fixed (exact): ${node.icon}`);
      fixedCount++;
      return;
    }
    
    // Try prefix/substring match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, exactPath] of searchLookup.entries()) {
      let score = 0;
      
      // Exact match gets priority
      if (key === normalized) {
        score = 200;
      }
      // Prefix match: "s3" matches "s3bucket"
      else if (key.startsWith(normalized) && normalized.length >= 2) {
        score = (normalized.length / key.length) * 150;
      } else if (normalized.startsWith(key) && key.length >= 2) {
        score = (key.length / normalized.length) * 150;
      }
      // Contains match
      else if (key.includes(normalized) && normalized.length >= 3) {
        score = (normalized.length / key.length) * 100;
      } else if (normalized.includes(key) && key.length >= 3) {
        score = (key.length / normalized.length) * 100;
      }
      
      if (score > bestScore && score > 30) {
        bestScore = score;
        bestMatch = exactPath;
      }
    }
    
    if (bestMatch) {
      node.icon = bestMatch;
      console.log(`[JSON Validator] → Fixed (fuzzy): ${node.icon} (score: ${bestScore.toFixed(0)})`);
      fixedCount++;
    } else {
      console.error(`[JSON Validator] → NO MATCH IN DATABASE for: ${originalPath}`);
      // Try to find ANY generic icon as ultimate fallback
      const genericIcon = Array.from(pathLookup.values()).find(p => p.includes('/General/'));
      if (genericIcon) {
        node.icon = genericIcon;
        console.log(`[JSON Validator] → Using generic fallback: ${genericIcon}`);
        fixedCount++;
      }
    }
  });
  
  console.log(`[JSON Validator] Summary: ${invalidCount} invalid, ${fixedCount} fixed`);
  
  return diagram;
}

// Helper function to auto-correct icon paths (fixes AI hallucinations)
function correctIconPaths(diagram, providerIcons, providers) {
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return diagram;
  }

  // Build a lookup map: filename -> full path
  const iconMap = new Map();
  providerIcons.forEach(icon => {
    // icon.category already includes provider name when from multiple providers
    const fullPath = icon.fullPath || `assets/icons/${icon.provider}/${icon.category}/${icon.filename}`;
    iconMap.set(icon.filename.toLowerCase(), fullPath);
    // Also add without .svg extension for fallback matching
    const nameWithoutExt = icon.filename.replace('.svg', '').toLowerCase();
    if (!iconMap.has(nameWithoutExt)) {
      iconMap.set(nameWithoutExt, fullPath);
    }
  });

  // Correct each node's icon path
  diagram.nodes.forEach(node => {
    if (node.icon) {
      const correctedPath = findCorrectIconPath(node.icon, iconMap);
      if (correctedPath) {
        console.log(`[Icon Fix] ${node.icon} → ${correctedPath}`);
        node.icon = correctedPath;
      }
    }
  });

  return diagram;
}

// Helper function to find correct icon path using fuzzy matching
function findCorrectIconPath(aiPath, iconMap) {
  // Extract filename from AI's path (e.g., "Azure/Network/AzureFrontDoor.svg" → "AzureFrontDoor.svg")
  const pathParts = aiPath.split('/');
  const aiFilename = pathParts[pathParts.length - 1]; // Last part

  // Try exact match first (case-insensitive)
  if (iconMap.has(aiFilename.toLowerCase())) {
    return iconMap.get(aiFilename.toLowerCase());
  }

  // Try without .svg extension
  const filenameWithoutExt = aiFilename.replace('.svg', '').toLowerCase();
  if (iconMap.has(filenameWithoutExt)) {
    return iconMap.get(filenameWithoutExt);
  }

  // Aggressive normalization: remove ALL non-alphanumeric characters and lowercase
  const normalizeString = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedAI = normalizeString(filenameWithoutExt);

  // Try exact normalized match
  for (const [key, path] of iconMap.entries()) {
    const normalizedKey = normalizeString(key.replace('.svg', ''));
    if (normalizedKey === normalizedAI) {
      console.log(`[Fuzzy Match] "${aiFilename}" → "${key}" (exact normalized)`);
      return path;
    }
  }

  // Partial match with intelligent scoring
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, path] of iconMap.entries()) {
    const normalizedKey = normalizeString(key.replace('.svg', ''));
    
    // Calculate similarity score
    let score = 0;
    
    // Full substring match (most valuable)
    if (normalizedKey.includes(normalizedAI) || normalizedAI.includes(normalizedKey)) {
      const longer = Math.max(normalizedKey.length, normalizedAI.length);
      const shorter = Math.min(normalizedKey.length, normalizedAI.length);
      score = (shorter / longer) * 100;
      
      // Bonus for exact length match
      if (normalizedKey.length === normalizedAI.length) {
        score += 20;
      }
      
      // Bonus for starts-with match
      if (normalizedKey.startsWith(normalizedAI) || normalizedAI.startsWith(normalizedKey)) {
        score += 15;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { key, path };
      }
    }
  }
  
  if (bestMatch && bestScore > 50) {
    console.log(`[Fuzzy Match] "${aiFilename}" → "${bestMatch.key}" (score: ${bestScore.toFixed(0)})`);
    return bestMatch.path;
  }

  // If no match found, return original (will 404, but at least we tried)
  console.warn(`[Icon Fix] No match found for: ${aiPath}`);
  return aiPath;
}

// Helper function to format icon paths for AI prompt
function formatIconPaths(icons, providers) {
  if (icons.length === 0) {
    return 'No icons found';
  }
  
  let formatted = '\n';
  let currentProvider = '';
  let currentCategory = '';
  
  icons.forEach(icon => {
    // Group by provider first
    if (icon.provider !== currentProvider) {
      currentProvider = icon.provider;
      formatted += `\n🔷 ${currentProvider} Icons:\n`;
      currentCategory = ''; // Reset category when provider changes
    }
    
    // Then by category
    if (icon.category !== currentCategory) {
      currentCategory = icon.category;
      formatted += `\n📁 ${currentCategory}:\n`;
    }
    
    // Use fullPath if available, otherwise construct it
    const fullPath = icon.fullPath || `assets/icons/${icon.provider}/${icon.category}/${icon.filename}`;
    // Extract service name from filename for easier matching
    const serviceName = icon.filename.replace('.svg', '').replace(/-/g, ' ');
    formatted += `  "${fullPath}"  // ${serviceName}\n`;
  });
  
  return formatted;
}

module.exports = {
  generateDiagramPrompt,
  validateAndFixPaths,
  correctIconPaths,
  findCorrectIconPath,
  formatIconPaths,
  detectProviders,
  checkForCommonFakePaths,
  extractProviderIcons
};
