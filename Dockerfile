FROM node:20-alpine
RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Install @expo/ngrok globally for tunnel mode support
RUN npm install -g @expo/ngrok@^4.1.0

COPY . .

EXPOSE 19000 19001 19002 19006 8081

ENV NODE_ENV=development
ENV EXPO_NO_DOTENV=0

# Start Expo with tunnel mode and web support
# Tunnel mode (requires EXPO_TOKEN in CapRover env vars)
# Web server will be available on port 19006
# Get token from: https://expo.dev/accounts/[username]/settings/access-tokens
CMD ["npx", "expo", "start", "--host", "tunnel", "--web", "--clear"]

