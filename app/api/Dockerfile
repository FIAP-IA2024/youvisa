FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port (Sprint 4: API listens on 5555)
EXPOSE 5555

# Start development server (the runtime is hot-reload via tsx watch)
CMD ["npm", "run", "dev"]
