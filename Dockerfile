FROM node:8
WORKDIR /usr/src/app
ADD package.json package-lock.json ./
RUN npm install
ADD index.js .
ENTRYPOINT node index.js
