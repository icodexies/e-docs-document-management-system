# The system as a container: build the site, serve it with nginx.
# Runs anywhere Docker runs:
#
#   docker build -t e-docs .
#   docker run -p 8080:80 e-docs        → http://localhost:8080
#
# or simply:  docker compose up --build
#
# The build reads `.env.production` (public values only) for the database
# address and the publishable/anon key. Copy `.env.production.example` to
# `.env.production` and fill in your own Supabase project before building.

# --- Build the site -------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci is the standard once package-lock.json is committed; the fallback
# keeps the very first build working before the lockfile exists.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- Serve it -------------------------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
