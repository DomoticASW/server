# syntax=docker/dockerfile:1

FROM node:23-alpine AS builder

WORKDIR /app

# Download dependencies as a separate step to take advantage of Docker's caching. 
# Leverage a cache mount to /root/.npm to speed up subsequent builds. 
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into 
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npx tsc

RUN npm run build-client


FROM node:23-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

USER node

EXPOSE 3000/tcp
EXPOSE 30000/udp

CMD ["node", "."]
