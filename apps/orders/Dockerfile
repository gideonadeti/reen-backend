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

# Copy .env file to apps/orders for prisma to use for generate
COPY .env apps/orders/.env

# Change to the apps/orders directory to run prisma
WORKDIR /app/apps/orders

# Generate Prisma client
RUN npx prisma generate

# Change back to the root directory
WORKDIR /app

# Build the NestJS app
RUN npm run build orders

# Clean up unnecessary files from the build stage
RUN rm -rf node_modules apps/orders/.env

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
COPY --from=build /app/.env apps/orders/.env

# Copy Prisma client
COPY --from=build /app/apps/orders/generated apps/orders/generated

# Copy package metadata to install only prod dependencies
COPY --from=build /app/package*.json .

# Install production dependencies only
RUN npm ci --omit=dev

# Remove leftover metadata files for smaller, safer image
RUN rm package*.json

# Expose app port
EXPOSE 5003

# Start the application
CMD ["node", "dist/apps/orders/main.js"]
