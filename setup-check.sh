#!/bin/bash

# Diagen Setup Verification Script
echo "======================================"
echo "Diagen - Setup Verification"
echo "======================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "  Found: $NODE_VERSION"
else
    echo "  ✗ Node.js not found. Please install Node.js 16.x or higher."
    exit 1
fi

# Check npm
echo "✓ Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "  Found: npm $NPM_VERSION"
else
    echo "  ✗ npm not found."
    exit 1
fi

# Check Ollama
echo "✓ Checking Ollama..."
if command -v ollama &> /dev/null; then
    echo "  Found: Ollama installed"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo "  ✓ Ollama server is running"
        
        # List available models
        echo ""
        echo "Available models:"
        ollama list
    else
        echo "  ⚠ Ollama is installed but not running."
        echo "  Start it with: ollama serve"
    fi
else
    echo "  ✗ Ollama not found."
    echo "  Install it from: https://ollama.com"
    echo ""
    echo "  After installation, pull required models:"
    echo "    ollama pull qwen2.5-coder:7b"
    echo "    ollama pull llama3.1:8b"
fi

# Check for node_modules
echo ""
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✓ Dependencies installed"
else
    echo "  ⚠ Dependencies not installed."
    echo "  Run: npm install"
fi

# Check for required directories
echo ""
echo "✓ Checking directory structure..."
DIRS=("public" "public/scripts" "public/styles" "assets/icons" "uploads" "exports")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir"
    else
        echo "  ✗ $dir not found"
    fi
done

echo ""
echo "======================================"
echo "Setup verification complete!"
echo "======================================"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
