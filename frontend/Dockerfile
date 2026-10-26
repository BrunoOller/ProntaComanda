# Frontend (React + Vite). Duas etapas: compila com Node e serve só os
# arquivos prontos com nginx (a imagem final não tem Node nem o código-fonte).
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
