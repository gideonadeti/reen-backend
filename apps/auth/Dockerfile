# ------------------------------
# Build Stage
# ------------------------------
FROM ghcr.io/gideonadeti/reen-backend-build-base-image:latest as build

WORKDIR /app

# Copy the full source code
COPY . .

# Change to the apps/auth directory to run prisma
WORKDIR /app/apps/auth

# Generate Prisma client
RUN npx prisma generate

# Change back to the root directory
WORKDIR /app

# Build the NestJS app
RUN npm run build auth

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

# Copy Prisma client
COPY --from=build /app/apps/auth/generated apps/auth/generated

# Expose app port
EXPOSE 5000

# Start the application
CMD ["node", "dist/apps/auth/main.js"]
