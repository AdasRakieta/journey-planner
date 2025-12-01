#!/bin/bash
# Script to login to GitHub Container Registry on Raspberry Pi

# Replace with your GitHub username and token
GITHUB_USERNAME="AdasRakieta"
GITHUB_TOKEN="YOUR_TOKEN_HERE"  # Replace with your actual token

echo "🔐 Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ Successfully logged in to ghcr.io"
    echo "📦 You can now pull private images from ghcr.io/$GITHUB_USERNAME/*"
else
    echo "❌ Login failed. Check your credentials."
    exit 1
fi
