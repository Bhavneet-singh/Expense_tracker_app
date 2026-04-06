FROM node:20-alpine

WORKDIR /app

# 1. Copy only dependency files first (better caching)
COPY package*.json ./

# 2. Install only production dependencies
RUN npm ci --only=production

# 3. Copy rest of the app
COPY . .

# 4. Generate Prisma client (only what's needed)
RUN npx prisma generate

# 5. Remove unnecessary cache
RUN npm cache clean --force

EXPOSE 8000

CMD ["node", "server.js"]