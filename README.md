# Diagen - AI-Powered Cloud Architecture Diagram Generator

## 📋 Overview

Diagen is an intelligent Node.js application that creates professional cloud and IT infrastructure blueprint diagrams using AI. Upload a Markdown file describing your architecture, and let local AI (powered by Ollama) automatically generate beautiful, editable diagrams with proper cloud service icons.

## ✨ Features

- **AI-Powered Generation**: Upload Markdown files and let AI automatically create architecture diagrams
- **Multi-Cloud Support**: Built-in icon libraries for AWS, Azure, GCP, and Kubernetes
- **Interactive Editor**: 
  - Freely movable diagram elements
  - Orthogonal connector lines
  - Drag-and-drop interface
  - Edge editing and rearrangement
- **Export Capabilities**: Export diagrams as PNG images
- **Local AI Models**: Powered by Ollama with support for:
  - `qwen2.5-coder:7b` (default)
  - `llama3.1:8b`
- **JSON Import/Export**: Save and load diagram blueprints

## 🎨 Design

- Clean, modern interface with white/light theme
- Primary accent color: `#4F46E5` (Indigo Blue)
- Responsive navigation with four main sections:
  - **Home**: Upload and load saved JSON diagram files
  - **AI Generator**: Upload Markdown files for AI-powered diagram generation
  - **Export**: Export diagrams as PNG images
  - **Settings**: Select and configure AI models

## 🏗️ Architecture

### Icon Library
The application includes comprehensive icon sets located in `assets/icons/`:
- **AWS**: 200+ service icons across Analytics, Compute, Database, Networking, Security, etc.
- **Azure**: Full suite of Azure service icons
- **GCP**: Google Cloud Platform service icons
- **Kubernetes**: Container orchestration icons
- **General**: Common IT infrastructure icons
- **Monitoring**: Observability and monitoring tool icons

### Project Structure
```
diagen/
├── server.js              # Express server with Ollama integration
├── package.json           # Node.js dependencies
├── public/               # Frontend assets
│   ├── index.html        # Main application interface
│   ├── styles/
│   │   └── main.css      # Application styles
│   └── scripts/          # Modular JavaScript files
│       ├── app.js        # Main application controller
│       ├── diagramEditor.js  # Diagram editing logic
│       ├── aiGenerator.js    # AI integration handling
│       ├── fileHandler.js    # JSON/MD file operations
│       ├── exportManager.js  # Export functionality
│       ├── settingsManager.js # Settings and preferences
│       └── iconLoader.js     # Icon library management
├── assets/
│   └── icons/            # Cloud service icons
└── examples/             # Sample diagram blueprints
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: Version 16.x or higher
2. **Ollama**: Install and run Ollama locally
   ```bash
   # Install Ollama (macOS)
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Pull required models
   ollama pull qwen2.5-coder:7b
   ollama pull llama3.1:8b
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/fakhrihuseynov/diagen.git
   cd diagen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## 📖 Usage

### Creating Diagrams with AI

1. Navigate to the **AI Generator** tab
2. Upload a Markdown file describing your architecture
3. The AI will analyze the content and generate a diagram using appropriate icons
4. Edit the generated diagram freely - move elements, adjust connectors
5. Export as PNG or save as JSON for later use

### Example Markdown Format

```markdown
# My Cloud Architecture

## Components
- AWS Lambda functions for serverless compute
- Amazon S3 for object storage
- Amazon RDS PostgreSQL database
- AWS API Gateway for REST APIs
- Amazon CloudFront for CDN

## Connections
- API Gateway connects to Lambda
- Lambda reads/writes to S3
- Lambda queries RDS database
- CloudFront serves static content from S3
```

### Loading Existing Diagrams

1. Navigate to the **Home** tab
2. Click "Upload JSON"
3. Select a previously exported JSON diagram file
4. The diagram loads in the editor ready for modifications

## 🔧 Configuration

Access the **Settings** panel to:
- Switch between AI models (qwen2.5-coder:7b or llama3.1:8b)
- Configure Ollama server connection
- Adjust diagram generation preferences

## 🎯 Technology Stack

- **Backend**: Node.js with Express
- **AI Integration**: Ollama API
- **Frontend**: Vanilla JavaScript (modular architecture)
- **Diagram Rendering**: Canvas API / SVG
- **Styling**: CSS3 with modern flexbox/grid layout

## 📝 Development

### Code Structure
The application follows a modular architecture with separated concerns:
- Each feature has its own JavaScript module
- Clean separation between UI, business logic, and data handling
- No spaghetti code - maintainable and scalable

### Contributing
Contributions are welcome! Please ensure:
- Code follows the modular structure
- No additional icon creation - use existing icon library
- Maintain clean, documented code

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Icons sourced from official cloud provider design kits
- Powered by Ollama and open-source LLMs
- Example diagrams showcase real-world architecture patterns

## 📧 Contact

Fakhri Huseynov - [@fakhrihuseynov](https://github.com/fakhrihuseynov)

Project Link: [https://github.com/fakhrihuseynov/diagen](https://github.com/fakhrihuseynov/diagen)