FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache curl

# Install Coral
RUN curl -L https://github.com/withcoral/coral/releases/download/v0.3.0/coral_linux_amd64 \
    -o /usr/local/bin/coral \
    && chmod +x /usr/local/bin/coral

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]