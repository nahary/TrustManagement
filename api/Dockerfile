FROM node:18.4.0-slim@sha256:d4ccbaac23809fd245fa7d5dfb8fbe18315c0014b4bcce2f0d98ced5086d6ab2

WORKDIR /home/node

COPY package.json ./
COPY package-lock.json ./
RUN apt-get -y update && apt-get -y install libtool autoconf automake
RUN npm ci

COPY src src/
COPY tsconfig.json .
RUN npm run build

ARG BUILDTIMESTAMP=''
ARG CI_COMMIT_SHA=''

ENV BUILDTIMESTAMP ${BUILDTIMESTAMP}
ENV CI_COMMIT_SHA ${CI_COMMIT_SHA}


# Give users permission to read and execute files
# Only root is the owner and has write permissions
RUN chmod -R u+rx /home/node
# Switch from root to normal user (this is a security best practice)
USER node

CMD npm start
