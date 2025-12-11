FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY apps ./apps

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

RUN npm run build ${APP_NAME}

FROM node:18-alpine

WORKDIR /app
COPY package*.json ./

RUN npm ci --only=production

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD node dist/apps/${APP_NAME}/main.js
