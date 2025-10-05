#!/bin/bash

echo "🚀 TikTakDex Setup Script"
echo "========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    echo "RPC_URL=https://rpc-amoy.polygon.technology/" > .env
    echo "PRIVATE_KEY=<your_private_key_here>" >> .env
    echo "✅ .env file created! Please add your private key."
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile contracts
echo "🔨 Compiling contracts..."
npm run compile

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your private key to .env file"
echo "2. Run: npm run deploy:amoy"
echo "3. Run: npm run start:dex"
echo "4. Visit: http://localhost:3000/dex"
echo ""
echo "🚀 Your TikTakDex is ready to deploy!"
