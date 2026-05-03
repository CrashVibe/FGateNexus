FROM oven/bun:latest AS build

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY . .
RUN bun install --frozen-lockfile

ARG SENTRY_DSN
ARG SENTRY_URL
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE

ENV SENTRY_DSN=$SENTRY_DSN \
	SENTRY_URL=$SENTRY_URL \
	SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
	SENTRY_RELEASE=$SENTRY_RELEASE

ENV NODE_ENV=production

RUN bun run build && bun run build:linux

FROM --platform=linux/amd64 debian:bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates chromium \
	&& rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium

COPY --from=build /app/dist/FGateNexus-linux-x64 ./FGateNexus

EXPOSE 3000 5140

VOLUME ["/app/config", "/app/data"]

CMD ["/app/FGateNexus"]

