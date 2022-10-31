# Foxhole Map Annotater

Annotate and draw on the foxhole map and share with your group.

## Todos

* One discord role for signs
* Another discord role for signs and lines
* A delete button to remove selected line/sign
* A "done" button to stop drawing a line
* Tooltips on mouseover
* A button to cut a line in two
* Selected symbols should not turn into dots when selected
* When line/sign is 12 hours old, a symbol beside the timestamp shows it is old
* When line/sign is 24 hours old, a symbol beside the timestamp shows it is very old 
* When a line is selected, a button is available to confirm the line still exists.
* logout button
* display discord name of user logged in
* Guide on how to use the map

## DevTodos

* Create a "Auth" free dev mode - without requiring each dev to create a discord app
* Replace Jade TemplateEngine
* Create and Push Docker Image to dockerhub?

## Run

Create a Discord OAuth 2 App (https://discord.com/developers/applications) and add `http://localhost:3000/connect/discord/callback` as redirect URL.

Create a .env file
```
NODE_ENV=development
ORIGIN=http://localhost:3000
DISCORD_KEY= # discord OAuth2 App Key 
DISCORD_SECRET= # discord OAuth2 App Secret
SECRET=aSecret
```

Create the map tiles
```
mkdir uploads
cd uploads
wget https://cdn.discordapp.com/attachments/1003485765273145424/1036149790897098772/totalmap.png
docker run --rm -v `pwd`:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w openlayers --tiledriver=WEBP --webp-lossless /tmp/files/totalmap.png /tmp/files/
```

Install dependencies and run dev mode
```
npm install
npm run dev
```

Open http://localhost:3000

## Live

In your env replace NODE_ENV with `production`, ORIGIN with your domain. In Discord add the Callback with your domain

Run `./start.bash` (creates a docker image and runs this image)
