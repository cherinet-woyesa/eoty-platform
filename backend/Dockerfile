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

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["npm", "start"]