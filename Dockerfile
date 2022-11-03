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
RUN npm install --production

COPY . .
COPY --from=build /app/public/javascripts /app/public/javascripts

CMD [ "node", "bin/www" ]