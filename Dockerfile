FROM node:10.16 AS builder

COPY . .
RUN npm install
RUN npm run compile

FROM node:10.16.0-alpine
WORKDIR /mps-microservice
COPY package*.json ./
COPY --from=builder /dist ./dist
COPY /public ./public
COPY /agent ./agent
RUN npm install --only=production

EXPOSE 4433
EXPOSE 3000
CMD [ "node", "./dist/index.js" ]