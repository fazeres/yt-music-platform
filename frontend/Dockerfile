FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
