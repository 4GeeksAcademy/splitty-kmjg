#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
if [ -d "migrations" ]; then
    echo "Running database migrations..."
    python -m flask db upgrade
else
    echo "WARNING: migrations folder not found. Skipping database upgrade."
fi

# Install Node dependencies and build frontend
npm install
npm run build
