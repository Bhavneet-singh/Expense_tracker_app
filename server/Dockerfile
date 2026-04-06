FROM node:20-alpine

WORKDIR /app

# Copy dependencies
COPY package*.json ./

# Install ALL deps (needed for build)
RUN npm install

# Copy code
COPY . .

# Build TypeScript → dist
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Remove dev dependencies (optimize)
RUN npm prune --production

# Clean cache
RUN npm cache clean --force

EXPOSE 8000

CMD ["node", "dist/index.js"]