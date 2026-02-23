# Diagen - User Guide

## Quick Start

### 1. Start the Application

```bash
npm start
```

The server will start on http://localhost:3000

### 2. Navigate the Interface

The application has four main sections accessible via the header navigation:

#### 🏠 Home
- **Upload JSON Diagrams**: Load previously saved diagram files
- **View Examples**: Explore sample diagrams for AWS, Azure, GCP, and Kubernetes
- Click on any example to load it into the editor

#### 🎨 AI Generator
- **Upload Markdown**: Drop or browse for .md files describing your architecture
- **View Preview**: See your markdown content before generation
- **Generate**: Click "Generate Diagram" to create your blueprint
- The AI will analyze your markdown and create a diagram using appropriate icons

#### 📤 Export
- **Interactive Canvas**: View and edit your generated diagram
- **Move Elements**: Click and drag any icon to reposition it
- **Orthogonal Lines**: Connections automatically use right-angle routing
- **Export PNG**: Download your diagram as an image
- **Save JSON**: Save diagram structure for later editing

#### ⚙️ Settings
- **Model Selection**: Choose between qwen2.5-coder:7b (faster) or llama3.1:8b (more accurate)
- **Connection Status**: Verify Ollama server connection
- **Grid Settings**: Adjust snap-to-grid size
- **Edge Style**: Toggle orthogonal (right-angle) connectors

## Creating Your First Diagram

### Method 1: AI Generation from Markdown

1. Create a markdown file describing your architecture:

```markdown
# My Web Application Architecture

## Frontend
- React application hosted on AWS S3
- CloudFront CDN for content delivery

## Backend
- API Gateway for REST endpoints
- Lambda functions for serverless compute
- DynamoDB for NoSQL database

## Connections
- CloudFront serves static files from S3
- Users access API through API Gateway
- API Gateway triggers Lambda functions
- Lambda functions read/write to DynamoDB
```

2. Navigate to **AI Generator**
3. Upload your markdown file
4. Click **Generate Diagram**
5. Wait for AI processing (usually 10-30 seconds)
6. View your generated diagram in the **Export** section

### Method 2: Load Existing JSON

1. Navigate to **Home**
2. Click **Browse Files** or drag a JSON diagram file
3. The diagram loads automatically in the editor

### Method 3: Start with Examples

1. Navigate to **Home**
2. Click on any example (AWS, Azure, GCP, Kubernetes)
3. The example diagram loads in the editor
4. Modify and customize as needed

## Diagram Editor Features

### Moving Elements
- **Click and Drag**: Click on any icon and drag to move it
- **Grid Snapping**: Elements automatically snap to a grid for alignment
- **Multi-positioning**: Arrange elements freely to create your desired layout

### Zoom and Pan
- **Zoom**: Use mouse wheel to zoom in/out (50% - 200%)
- **Pan**: Hold and drag on empty canvas space to pan

### Editing Connections
- Connections (edges) automatically update when you move elements
- Orthogonal routing maintains right-angle paths
- Labels display relationship information

### Context Menu
- **Right-click** on any element to access quick actions
- **Delete**: Remove unwanted elements

## Icon Library

The application includes comprehensive icon sets:

### AWS Icons (200+)
- **Analytics**: Athena, EMR, Glue, Kinesis, Redshift, QuickSight
- **Compute**: EC2, Lambda, ECS, EKS, Fargate, Batch
- **Database**: RDS, DynamoDB, Aurora, ElastiCache, DocumentDB
- **Storage**: S3, EBS, EFS, Glacier, Storage Gateway
- **Networking**: VPC, Route 53, CloudFront, API Gateway, ELB
- **Security**: IAM, KMS, Secrets Manager, WAF, Shield
- And many more...

### Azure Icons
- **Compute**: Virtual Machines, App Service, Functions, AKS
- **Databases**: SQL Database, Cosmos DB, Database for PostgreSQL
- **Storage**: Blob Storage, Files, Queue Storage, Disk Storage
- **Networking**: Virtual Network, Load Balancer, Application Gateway
- **AI/ML**: Cognitive Services, Machine Learning, Bot Service
- And more...

### GCP Icons
- Core GCP services and components

### Kubernetes Icons
- Pods, Services, Deployments, Ingress, ConfigMaps, Secrets, etc.

### General & Monitoring Icons
- Common IT infrastructure components
- Monitoring and observability tools

## Markdown Format Tips

For best results when using AI generation:

### Structure Your Document
```markdown
# Architecture Title

## Components
- Service 1: Description
- Service 2: Description
- Service 3: Description

## Connections
- Service 1 connects to Service 2
- Service 2 reads from Service 3
```

### Be Specific
- Mention exact service names (e.g., "AWS Lambda" not just "serverless")
- Include connection types (e.g., "reads from", "writes to", "triggers")
- Describe data flow direction

### Use Cloud Provider Names
- Specify which cloud provider (AWS, Azure, GCP)
- Use official service names when possible

### Example Patterns

**Microservices:**
```markdown
## Services
- User Service (Node.js API)
- Order Service (Python API)
- Payment Service (Java API)
- Message Queue (RabbitMQ)

## Data Flow
- User Service publishes events to Message Queue
- Order Service consumes user events
- Order Service calls Payment Service REST API
```

**Data Pipeline:**
```markdown
## Data Sources
- Application Logs (S3)
- User Events (Kinesis)

## Processing
- Lambda function processes events
- Glue ETL transforms data

## Storage
- Redshift data warehouse
- QuickSight for visualization
```

## Exporting Your Diagrams

### PNG Export
1. Navigate to **Export** section
2. Arrange your diagram as desired
3. Click **Export as PNG**
4. Image downloads automatically with timestamp filename

### JSON Export
1. Click **Save as JSON** in the Export section
2. File saves both locally and to server
3. Use this file to reload and continue editing later

### File Naming
- PNG: `diagram-YYYY-MM-DDTHH-MM-SS.png`
- JSON: `diagram-YYYY-MM-DDTHH-MM-SS.json`

## Troubleshooting

### Ollama Connection Issues

**Problem**: "Cannot connect to Ollama" error

**Solutions**:
1. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Start Ollama if not running:
   ```bash
   ollama serve
   ```

3. Check if required models are installed:
   ```bash
   ollama list
   ```

4. Pull missing models:
   ```bash
   ollama pull qwen2.5-coder:7b
   ollama pull llama3.1:8b
   ```

### Generation Takes Too Long

**Problem**: AI generation times out or takes very long

**Solutions**:
1. Switch to qwen2.5-coder:7b model (faster)
2. Simplify your markdown description
3. Reduce the number of components in your architecture
4. Ensure Ollama has sufficient system resources

### Icons Not Displaying

**Problem**: Diagram shows "?" instead of icons

**Solutions**:
1. Check that `assets/icons/` directory exists
2. Verify icon paths in JSON are correct
3. Ensure web server can serve static files from assets directory
4. Check browser console for 404 errors

### Canvas Not Rendering

**Problem**: Canvas appears blank

**Solutions**:
1. Check browser JavaScript console for errors
2. Ensure canvas element has proper dimensions
3. Try clearing browser cache
4. Reload the page

## Keyboard Shortcuts

Currently, the application primarily uses mouse interactions. Keyboard shortcuts may be added in future versions.

## Best Practices

### Diagram Layout
- **Start from Left**: Place user-facing or input components on the left
- **Flow Right**: Arrange data flow from left to right
- **Group Related**: Keep related services close together
- **Leave Space**: Don't overcrowd - use canvas space effectively

### Using AI Generation
- **Iterate**: Start simple, then add details
- **Be Explicit**: Clearly state connections and relationships
- **Review**: Always review and adjust AI-generated diagrams
- **Save Progress**: Export JSON frequently to save your work

### Performance
- **Large Diagrams**: Keep diagrams under 50 components for best performance
- **Icon Loading**: Icons are cached after first load
- **Zoom Level**: Use zoom for detailed work, standard view for overview

## API Reference

If you're extending the application, here are the key API endpoints:

### GET /api/health
Health check endpoint

### GET /api/ollama/models
List available Ollama models

### POST /api/upload/markdown
Upload markdown file for processing

### POST /api/upload/json
Upload JSON diagram file

### POST /api/generate
Generate diagram from markdown using AI

### GET /api/icons
Get icon directory structure

### POST /api/save
Save diagram to server

## Contributing

Contributions are welcome! Please ensure:

1. **Code Style**: Follow existing patterns
2. **Modular Structure**: Keep JavaScript files separated by concern
3. **No Icon Creation**: Use only existing icons from the library
4. **Documentation**: Comment complex logic
5. **Testing**: Test with multiple browsers

## Support

For issues or questions:
- Check this guide first
- Review the main README.md
- Check Ollama documentation for model issues
- Open an issue on GitHub

## License

MIT License - See LICENSE file for details
