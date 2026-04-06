FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 🔥 FIX: generate prisma FIRST
RUN npx prisma generate

# THEN build
RUN npm run build

# cleanup
RUN npm prune --production
RUN npm cache clean --force

EXPOSE 8000

CMD ["node", "dist/index.js"]