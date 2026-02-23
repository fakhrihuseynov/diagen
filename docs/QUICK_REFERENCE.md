# Diagen - Quick Reference Card

## 🚀 Quick Start

```bash
# Start the application
npm start

# Verify setup
./setup-check.sh

# Check Ollama status
ollama list
```

**Access**: http://localhost:3000

---

## 📑 Navigation

| Button | Purpose |
|--------|---------|
| **Home** | Load JSON diagrams or view examples |
| **AI Generator** | Upload markdown files for AI generation |
| **Export** | Edit diagram and export to PNG/JSON |
| **Settings** | Configure AI models and preferences |

---

## 🎯 Common Tasks

### Generate Diagram from Markdown
1. AI Generator → Upload .md file
2. Click "Generate Diagram"
3. Wait 10-30 seconds
4. View in Export section

### Load Existing Diagram
1. Home → Upload JSON file
2. Diagram loads automatically
3. Edit in Export section

### Export Diagram
1. Export → Arrange elements
2. Click "Export as PNG" or "Save as JSON"
3. File downloads automatically

### Change AI Model
1. Settings → Model Selection
2. Choose qwen2.5-coder:7b (fast) or llama3.1:8b (accurate)

---

## ⌨️ Canvas Controls

| Action | How |
|--------|-----|
| **Move Element** | Click and drag icon |
| **Zoom In/Out** | Mouse wheel up/down |
| **Pan Canvas** | Drag empty space |
| **Delete Element** | Right-click → Confirm |

---

## 📝 Markdown Template

```markdown
# Architecture Title

## Components
- Service Name 1 (AWS Lambda)
- Service Name 2 (Amazon S3)
- Service Name 3 (Amazon RDS)

## Connections
- Lambda function writes to S3
- Lambda function reads from RDS
- S3 triggers Lambda on upload
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to Ollama | Run `ollama serve` |
| Models not found | Run `ollama pull qwen2.5-coder:7b` |
| Icons not showing | Check assets/icons/ folder exists |
| Canvas blank | Check browser console for errors |
| Generation timeout | Switch to qwen2.5-coder:7b model |

---

## 📊 File Formats

### JSON Diagram Format
```json
{
  "nodes": [{
    "id": "unique-id",
    "label": "Service Name",
    "icon": "assets/icons/AWS/Compute/Lambda.svg",
    "position": { "x": 100, "y": 100 }
  }],
  "edges": [{
    "id": "edge-id",
    "source": "node-id-1",
    "target": "node-id-2",
    "label": "connection",
    "type": "orthogonal"
  }]
}
```

---

## 🎨 Icon Paths

| Provider | Path |
|----------|------|
| AWS | `assets/icons/AWS/[Category]/[Service].svg` |
| Azure | `assets/icons/Azure/[category]/[Service].svg` |
| GCP | `assets/icons/GCP/[Service].svg` |
| Kubernetes | `assets/icons/Kubernetes/[resource].svg` |

**Example**: `assets/icons/AWS/Compute/Lambda.svg`

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/ollama/models` | GET | List models |
| `/api/upload/markdown` | POST | Upload MD file |
| `/api/upload/json` | POST | Upload JSON diagram |
| `/api/generate` | POST | Generate diagram |
| `/api/icons` | GET | Get icon list |
| `/api/save` | POST | Save diagram |

---

## 💡 Tips

✅ **DO**
- Use specific service names (e.g., "AWS Lambda")
- Describe connections clearly
- Start with simple architectures
- Save work frequently (JSON export)
- Use examples as starting points

❌ **DON'T**
- Upload files larger than 10MB
- Create overly complex diagrams (>50 components)
- Modify icon assets directly
- Rely solely on AI - always review output

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5",
  "cors": "^2.8.5",
  "axios": "^1.6.5",
  "dotenv": "^16.3.1"
}
```

---

## 🎓 Support Resources

- **Documentation**: README.md, USER_GUIDE.md
- **Setup Check**: `./setup-check.sh`
- **Ollama Docs**: https://ollama.com/docs
- **GitHub**: https://github.com/fakhrihuseynov/diagen

---

**Version**: 1.0.0 | **License**: MIT | **Node**: 16+
