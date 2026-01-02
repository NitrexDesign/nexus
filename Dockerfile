# Build Stage: Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/web
ARG NEXT_BUILD_DATE
ENV NEXT_BUILD_DATE=${NEXT_BUILD_DATE:-unknown}
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY web/package.json ./
COPY web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web ./
RUN pnpm build

# Build Stage: Backend
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o nexus ./cmd/server/main.go

# Production Stage
FROM alpine:latest
WORKDIR /app
COPY --from=backend-builder /app/nexus .
COPY --from=frontend-builder /app/web/out ./web
COPY --from=frontend-builder /app/web/public ./web/public
RUN mkdir -p /app/data

ENV PORT=8080
ENV DB_PATH=/app/data/nexus.db
EXPOSE 8080

CMD ["./nexus"]
