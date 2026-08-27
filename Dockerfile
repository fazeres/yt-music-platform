FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip curl openssl && \
    pip3 install --break-system-packages yt-dlp

WORKDIR /app

# 1. Build Frontend
COPY frontend/package*.json ./frontend/
RUN npm install -g pnpm@9 && cd frontend && pnpm install

COPY frontend ./frontend
RUN cd frontend && pnpm build

# 2. Build Backend
COPY package*.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src

RUN pnpm build

EXPOSE 8080

CMD ["node", "dist/server.js"]
