# Backend (Node + Express). Debian "slim" e não alpine de propósito: o argon2
# é um módulo nativo e a imagem glibc é a que ele tem binário pronto pra usar
# (sem precisar de compilador dentro do container).
FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependências primeiro, pra o Docker reaproveitar essa camada enquanto o
# package.json não mudar.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# O backend grava em logs/ (winston) e uploads/ (fotos de produto): as pastas
# precisam existir e ser do usuário "node", que é quem roda o processo.
RUN mkdir -p logs uploads/produtos && chown -R node:node logs uploads
USER node

EXPOSE 3333
CMD ["node", "server.js"]
