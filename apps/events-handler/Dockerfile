# ------------------------------
# Build Stage
# ------------------------------
FROM node:22 AS build

WORKDIR /app

# Copy lockfile and package metadata
COPY package*.json .

# Install exact dependencies
RUN npm ci

# Copy the full source code
COPY . .

# Build the NestJS app
RUN npm run build events-handler

# Clean up unnecessary files from the build stage
RUN rm -rf node_modules

# ------------------------------
# Production Stage
# ------------------------------
FROM node:22

WORKDIR /app

# Set runtime environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy compiled output from build stage
COPY --from=build /app/dist dist

# Copy .proto files
COPY --from=build /app/libs/protos/src/*.proto dist/libs/protos/

# Copy .env file
COPY --from=build /app/.env apps/events-handler/.env

# Copy package metadata to install only prod dependencies
COPY --from=build /app/package*.json .

# Install production dependencies only
RUN npm ci --omit=dev

# Remove leftover metadata files for smaller, safer image
RUN rm package*.json

# Start the application
CMD ["node", "dist/apps/events-handler/main.js"]
