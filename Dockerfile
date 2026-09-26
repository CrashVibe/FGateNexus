FROM --platform=linux/amd64 debian:bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		chromium-headless-shell \
	&& rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium-headless-shell
# 容器里要对外监听
ENV HOST=0.0.0.0 KOISHI_HOST=0.0.0.0

COPY ./dist/FGateNexus-linux-x64 ./FGateNexus

EXPOSE 3000 5140

VOLUME ["/app/config", "/app/data"]

CMD ["/app/FGateNexus"]

