FROM node:18.4.0-alpine@sha256:7ae41699c38d8e50f5bf592867cf661368d71ff922e07f6f66f36dca2ff0c590 as builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . ./
RUN npm run build

######

FROM nginx:1.21.6-alpine@sha256:a74534e76ee1121d418fa7394ca930eb67440deda413848bc67c68138535b989

ARG USE_SSL
ARG SSL_DOMAIN

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-ssl.conf /etc/nginx/conf.d/default-ssl.conf
COPY certificates/* /etc/ssl/${SSL_DOMAIN}/
COPY configureServer.sh /usr/
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

ARG BUILDTIMESTAMP=''
ARG CI_COMMIT_SHA=''

ENV BUILDTIMESTAMP ${BUILDTIMESTAMP}
ENV CI_COMMIT_SHA ${CI_COMMIT_SHA}
ENV USE_SSL ${USE_SSL}
ENV SSL_DOMAIN ${SSL_DOMAIN}

# Run nginx
CMD /bin/ash /usr/configureServer.sh
