FROM node:24-slim AS build
WORKDIR /app
RUN npm i -g pnpm@12.11.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/data NODE_OPTIONS=--disable-warning=ExperimentalWarning
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/assets ./assets
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
