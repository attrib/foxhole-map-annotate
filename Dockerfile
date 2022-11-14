FROM node:19 AS build
ENV NODE_ENV=development
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .

RUN npm run build

FROM node:19-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --omit=dev

COPY . .
COPY --from=build /app/public/dist /app/public/dist

ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}

CMD [ "node", "bin/www" ]