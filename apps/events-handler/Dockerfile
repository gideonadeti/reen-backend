# ------------------------------
# Build Stage
# ------------------------------
FROM ghcr.io/gideonadeti/reen-backend-build-base-image:latest as build

WORKDIR /app

# Copy the full source code
COPY . .

# Build the NestJS app
RUN npm run build events-handler

# Clean up unnecessary files from the build stage
RUN rm -rf node_modules

# ------------------------------
# Production Stage
# ------------------------------
FROM ghcr.io/gideonadeti/reen-backend-prod-base-image:latest

WORKDIR /app

# Set runtime environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy compiled output from build stage
COPY --from=build /app/dist dist

# Copy .proto files
COPY --from=build /app/libs/protos/src/*.proto dist/libs/protos/

# Start the application
CMD ["node", "dist/apps/events-handler/main.js"]
