# Use the official Microsoft Playwright image with Node.js and pre-installed browser binaries
FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Set working directory inside container
WORKDIR /app

# Copy package manifest files first for optimized Docker layer caching
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy remaining framework source code
COPY . .

# Set environment variable for CI context
ENV CI=true

# Default command: execute Playwright test runner
CMD ["npx", "playwright", "test"]
