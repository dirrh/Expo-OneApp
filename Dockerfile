FROM node:20-alpine
RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# Install @expo/ngrok globally for tunnel mode support
RUN npm install -g @expo/ngrok@^4.1.0

COPY . .

EXPOSE 19000 19001 19002

ENV NODE_ENV=development
ENV EXPO_NO_DOTENV=0

CMD ["npx", "expo", "start", "--host", "tunnel", "--clear"]

