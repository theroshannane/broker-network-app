FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Production talks to Neon Postgres via DATABASE_URL (set in the Render env).
# Do NOT bake PGLITE_DIR here: PGlite is an in-process WASM Postgres kept only
# for local/tests, and it OOMs Render free 512Mi at boot.

EXPOSE 3000
CMD ["node", "dist/index.js"]
