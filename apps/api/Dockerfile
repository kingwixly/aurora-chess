FROM eyeonchess-base AS base

# API needs stockfish for bot games
RUN apt-get update && \
    apt-get install -y --no-install-recommends stockfish && \
    rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/games:${PATH}"

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/chess/package.json ./packages/chess/

RUN pnpm install --frozen-lockfile && pnpm store prune

COPY packages/chess ./packages/chess
COPY apps/api ./apps/api

RUN pnpm --filter @eyeonchess/api run db:generate

EXPOSE 3001

CMD ["pnpm", "--filter", "@eyeonchess/api", "dev"]
