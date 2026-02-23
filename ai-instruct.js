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
      // Check for direct icon (no category) - for flat providers like Kubernetes/Monitoring
      // Pattern: "│       │   ├── api.svg" or "│           ├── prometheus.svg"
      const directIconMatch = line.match(/│\s+│?\s+[├└]── (.+\.svg)\s*$/);
      if (directIconMatch) {
        const iconFile = directIconMatch[1].trim();
        // For flat providers, use 'General-Icons' or provider name as category
        const categoryName = currentCategory || 'General-Icons';
        icons.push({
          provider: provider,
          category: categoryName,
          filename: iconFile,
          fullPath: `assets/icons/${provider}/${iconFile}`
        });
        continue;
      }
      
      // Check if this is a category-based icon (3 levels deep): "│       │   │   ├── Athena.svg"
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

// AI PROMPT GENERATOR
function generateDiagramPrompt(markdown, detectedProviders, iconPathList) {
  return `You are a cloud architecture diagram generator. Generate a JSON diagram from the markdown below.

DETECTED TECHNOLOGIES: ${detectedProviders.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔️ ABSOLUTE RULES - BREAKING THESE CAUSES SYSTEM FAILURE ⛔️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 CRITICAL: EVERY icon path MUST be COPIED EXACTLY from the list below
🔥 DO NOT create ANY path that doesn't exist in the list
🔥 DO NOT shorten, modify, or simplify ANY filename
🔥 DO NOT remove category folders from paths
🔥 DO NOT use lowercase provider names (AWS not aws)
🔥 CTRL+C CTRL+V THE EXACT PATH - NO TYPING, NO GUESSING

AVAILABLE ICONS (COPY THESE EXACT PATHS):
${iconPathList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CORRECT PATH PATTERN:
- "icon": "assets/icons/[Provider]/[Category]/[Complete-Filename-With-All-Words].svg"
- ALWAYS include the category folder (3rd level)
- ALWAYS use FULL filename as shown in the list above
- ALWAYS match exact case (Provider starts with Capital)

🚫 FORBIDDEN PATTERNS (these cause 404 errors):
- ❌ Shortened filenames: "Service.svg" instead of "Service-Full-Name.svg"
- ❌ Missing category: "assets/icons/Provider/File.svg" (missing category folder)
- ❌ Wrong case: "assets/icons/provider/category/file.svg" (must match exact case)
- ❌ Made-up paths: typing instead of copy-pasting from the list above

⚠️ CRITICAL: Many services have FULL names with hyphens or multiple words
Example patterns you MUST follow:
- Storage services often have suffixes: "Service-bucket.svg", "Service-storage.svg"
- Networking often has full descriptions: "Service-load-balancer.svg", "Service-and-CDN.svg"
- NEVER shorten these - use the COMPLETE filename from the list

Position nodes with 250-350px spacing. All edges use "orthogonal" type.

MARKDOWN INPUT:
${markdown}

OUTPUT JSON FORMAT:
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Service Display Name",
      "icon": "assets/icons/Provider/category/Exact-Icon-Filename.svg",
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
    "technologies": "${detectedProviders.join(', ')}"
  }
}

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown code blocks, just the JSON object.

Generate now:`;
}

// PRE-VALIDATION: Check if AI generated any fake common paths
function checkForCommonFakePaths(diagram) {
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return { valid: true, errors: [] };
  }

  const knownFakePaths = [
    'S3.svg',
    'RDS.svg', 
    'EC2.svg',
    'EKS.svg',
    'Lambda.svg',
    'DynamoDB.svg',
    'CloudFront.svg',
    'Route53.svg',
    'VPC.svg',
    'IAM.svg',
    'Redis.svg',
    'CosmosDB.svg',
    'AKS.svg'
  ];

  const errors = [];
  
  diagram.nodes.forEach((node, idx) => {
    if (!node.icon) return;
    
    const filename = node.icon.split('/').pop();
    
    // Check if it's a known fake shortened name
    if (knownFakePaths.includes(filename)) {
      errors.push(`Node ${idx} (${node.label || 'unnamed'}): Uses fake shortened filename "${filename}"`);
    }
    
    // Check if path is too short (likely missing category)
    const pathParts = node.icon.split('/');
    if (pathParts.length < 4) { // Should be: assets/icons/Provider/Category/File.svg
      errors.push(`Node ${idx} (${node.label || 'unnamed'}): Path too short, missing category folder: "${node.icon}"`);
    }
  });

  if (errors.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⛔️ AI GENERATED FAKE PATHS - REJECTED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// AGGRESSIVE PATH VALIDATOR: Checks filesystem and forces corrections
function validateAndFixPaths(diagram, providerIcons, projectRoot) {
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return diagram;
  }

  // Build comprehensive icon map with ALL possible matches
  const iconMap = new Map();
  const pathMap = new Map(); // fullPath -> icon object
  
  providerIcons.forEach(icon => {
    const fullPath = icon.fullPath || `assets/icons/${icon.provider}/${icon.category}/${icon.filename}`;
    
    // Store by full path
    pathMap.set(fullPath.toLowerCase(), fullPath);
    
    // Store by filename
    iconMap.set(icon.filename.toLowerCase(), fullPath);
    
    // Store by filename without extension
    const nameWithoutExt = icon.filename.replace('.svg', '').toLowerCase();
    iconMap.set(nameWithoutExt, fullPath);
    
    // Store by just the icon name (for aggressive matching)
    const iconName = icon.filename.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    iconMap.set(iconName, fullPath);
  });

  console.log(`[Path Validator] Built icon map with ${iconMap.size} entries`);

  // Validate and fix each node
  let fixedCount = 0;
  let invalidCount = 0;
  
  diagram.nodes.forEach(node => {
    if (!node.icon) return;
    
    const originalPath = node.icon;
    
    // Check if path exists on filesystem
    const filePath = path.join(projectRoot, node.icon);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      console.log(`[Path Validator] ✓ Valid: ${node.icon}`);
      return; // Path is good
    }
    
    // Path doesn't exist - FORCE correction
    invalidCount++;
    console.warn(`[Path Validator] ✗ INVALID: ${originalPath}`);
    
    // Try exact path match first (case-insensitive)
    const lowerPath = originalPath.toLowerCase();
    if (pathMap.has(lowerPath)) {
      node.icon = pathMap.get(lowerPath);
      console.log(`[Path Validator] → Fixed (case): ${node.icon}`);
      fixedCount++;
      return;
    }
    
    // Extract filename and find match
    const filename = originalPath.split('/').pop();
    const normalized = filename.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try exact normalized match
    if (iconMap.has(normalized)) {
      node.icon = iconMap.get(normalized);
      console.log(`[Path Validator] → Fixed (exact): ${node.icon}`);
      fixedCount++;
      return;
    }
    
    // Try prefix match: "s3" should match "s3bucket", "s3onoutposts"
    let bestPrefixMatch = null;
    let bestPrefixScore = 0;
    
    for (const [key, fullPath] of iconMap.entries()) {
      const keyNormalized = key.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // If AI name is a prefix of our icon name (s3 -> s3bucket)
      if (keyNormalized.startsWith(normalized) && normalized.length >= 2) {
        const score = normalized.length / keyNormalized.length * 100;
        if (score > bestPrefixScore) {
          bestPrefixScore = score;
          bestPrefixMatch = fullPath;
        }
      }
      
      // If our icon name is a prefix of AI name (rare but possible)
      if (normalized.startsWith(keyNormalized) && keyNormalized.length >= 2) {
        const score = keyNormalized.length / normalized.length * 100;
        if (score > bestPrefixScore) {
          bestPrefixScore = score;
          bestPrefixMatch = fullPath;
        }
      }
    }
    
    if (bestPrefixMatch && bestPrefixScore > 20) {
      node.icon = bestPrefixMatch;
      console.log(`[Path Validator] → Fixed (prefix): ${node.icon} (score: ${bestPrefixScore.toFixed(0)})`);
      fixedCount++;
      return;
    }
    
    // Last resort: fuzzy match
    const corrected = findCorrectIconPath(originalPath, iconMap);
    if (corrected && corrected !== originalPath) {
      node.icon = corrected;
      console.log(`[Path Validator] → Fixed (fuzzy): ${node.icon}`);
      fixedCount++;
    } else {
      console.error(`[Path Validator] → NO MATCH FOUND for: ${originalPath}`);
    }
  });
  
  console.log(`[Path Validator] Summary: ${invalidCount} invalid paths, ${fixedCount} fixed`);
  
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
