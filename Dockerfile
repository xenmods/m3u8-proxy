FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install

EXPOSE 4021

CMD ["bun", "start"]
