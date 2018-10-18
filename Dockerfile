FROM node:8
WORKDIR /usr/src/app
ADD index.js .
ADD package.json .
ADD package-lock.json .
RUN npm install
ENTRYPOINT node index.js
