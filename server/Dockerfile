FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ✅ Now schema exists → safe to run
RUN npx prisma generate

EXPOSE 8000

CMD ["npm", "start"]