# Use Node.js 18 as the base image
FROM node:18-alpine

# Install FFmpeg (includes ffprobe) for video processing
RUN apk add --no-cache ffmpeg

# Verify FFmpeg installation
RUN ffmpeg -version && ffprobe -version

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for migrations)
RUN npm ci --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Create necessary directories
RUN mkdir -p tmp uploads/videos uploads/documents uploads/profiles uploads/subtitles uploads/thumbnails uploads/temp

# Expose the port the app runs on
EXPOSE 5000

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Start the application (migrations run automatically via start script)
CMD ["npm", "start"]