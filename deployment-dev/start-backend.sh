#!/bin/bash

# Backend Start Script
# Starts the FastAPI pivot backend server

set -e  # Exit on error

echo "=========================================="
echo "Starting Pivot Backend API"
echo "=========================================="

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Activate conda environment
echo "🔧 Activating conda environment 'llm-agno'..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate llm-agno

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -q fastapi uvicorn duckdb pydantic python-multipart

# Check if data exists
if [ ! -d "data" ] || [ -z "$(ls -A data/*.duckdb 2>/dev/null)" ]; then
    echo "⚠️  Sample data not found. Creating sample data..."
    python3 create_sample_data.py
fi

# Start the server
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "   Press CTRL+C to stop"
echo ""
python3 pivot_api.py