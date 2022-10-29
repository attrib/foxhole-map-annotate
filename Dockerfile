FROM node AS build
ENV NODE_ENV=development
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .

ARG ORIGIN
ENV ORIGIN=${ORIGIN}

RUN npm run build

FROM node
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production

COPY . .
COPY --from=build /app/public/javascripts /app/public/javascripts

CMD [ "node", "bin/www" ]