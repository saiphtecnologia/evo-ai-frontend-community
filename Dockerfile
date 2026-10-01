# Build stage
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build with placeholder values that will be replaced at runtime
ENV VITE_API_URL=VITE_API_URL_PLACEHOLDER
ENV VITE_AUTH_API_URL=VITE_AUTH_API_URL_PLACEHOLDER
ENV VITE_WS_URL=VITE_WS_URL_PLACEHOLDER
ENV VITE_EVOAI_API_URL=VITE_EVOAI_API_URL_PLACEHOLDER
ENV VITE_AGENT_PROCESSOR_URL=VITE_AGENT_PROCESSOR_URL_PLACEHOLDER

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy runtime entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
