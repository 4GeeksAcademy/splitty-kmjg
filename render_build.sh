#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python -m flask db upgrade

# Install Node dependencies and build frontend
npm install
npm run build
