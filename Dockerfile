FROM node:20-alpine

WORKDIR /app

# Install Coral CLI
RUN apk add --no-cache curl tar

RUN curl -L https://github.com/withcoral/coral/releases/download/v0.4.1/coral-x86_64-unknown-linux-gnu.tar.gz \
    -o /tmp/coral.tar.gz \
    && tar -xzf /tmp/coral.tar.gz -C /tmp \
    && mv /tmp/coral /usr/local/bin/coral \
    && chmod +x /usr/local/bin/coral

# Verify Coral installed
RUN coral --version

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]