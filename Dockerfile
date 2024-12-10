FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install

EXPOSE 4000

CMD ["bun", "start"]
