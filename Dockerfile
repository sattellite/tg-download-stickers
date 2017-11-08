FROM node:6
WORKDIR /usr/src/app
ADD index.js .
ADD package.json .
RUN npm install
ENTRYPOINT node index.js
