FROM node:22-alpine

WORKDIR /app

ENV PORT=8002
ENV LEADERBOARD_PATH=/data/leaderboard.json

COPY . .

RUN mkdir -p /data

EXPOSE 8002
VOLUME ["/data"]

CMD ["node", "server.js"]
