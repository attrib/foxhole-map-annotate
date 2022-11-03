# Foxhole Map Annotate

Annotate and draw on the foxhole map and share with your group.

## Todos

* ACL
  * One discord role for viewing
  * One discord role for signs
  * One discord role for signs and lines
* A delete button to remove selected line/sign
* A "done" button to stop drawing a line
* Tooltips on mouseover
* A button to cut a line in two
* Selected symbols should not turn into dots when selected
* When line/sign is 12 hours old, a symbol beside the timestamp shows it is old
* When line/sign is 24 hours old, a symbol beside the timestamp shows it is very old 
* When a line is selected, a button is available to confirm the line still exists.
* Facility Markers (new icons by Bazlow + polygon area with text?)
* Guide on how to use the map

* planed tracks (dashed lines)
* add resource fields (+ other stuff) from official warapi

## DevTodos

* Create and Push Docker Image to dockerhub?

## Run Dev

Copy `.env.dist` to `.env`

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

## Run Live

Create a Discord OAuth 2 App (https://discord.com/developers/applications) and add `https://<yourdomain.tld>/connect/discord/callback` as redirect URL.

Copy `.env.dist` to `.env`

* Set NODE_ENV with `production`
* Set ORIGIN to `https://<yourdomain.tld>/`
* Set DISCORD_KEY and DISCORD_SECRET as provided by Discord

Run `./start.bash` (creates a docker image and runs this image)

Have an apache/nginx proxy terminating SSL and pointing to 127.0.0.1:3033.

Make sure it can handle WebSocket upgrades.
