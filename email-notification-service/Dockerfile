FROM node:18.4.0-alpine@sha256:7ae41699c38d8e50f5bf592867cf661368d71ff922e07f6f66f36dca2ff0c590

WORKDIR /home/node

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY src src/
COPY tsconfig.json .

RUN npm run build

# Use node user to execute the application. Node user is not in su list
USER node

CMD npm start
