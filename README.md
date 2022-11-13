# Foxhole Map Annotate

Annotate and draw on the foxhole map and share with your group.

## Todos

* Guide on how to use the map (partially done)

* A button to cut a line in two

* add resource fields (+ other stuff) from official warapi

* warning/error when websocket disconnected / reconnect mechanic / disable websocket when not active

* Partisan Icons/Rail (new Role, new Icons, Green Rail)

## DevTodos

* Rework WebSockets to allow partial updates 
* Add reload Map data/ACL route for super admin
* investigate about rate limits for discord api

## Run Dev

Copy `.env.dist` to `.env`

Create the map tiles
```
mkdir uploads
cd uploads
wget https://cdn.discordapp.com/attachments/1003485765273145424/1039646692095574046/entiremap.png
docker run --rm -v `pwd`:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w openlayers --tiledriver=WEBP --webp-lossless /tmp/files/entiremap.png /tmp/files/
```

Install dependencies and run dev mode
```
npm install
npm run dev
```

Open http://localhost:3000

## Run Live

Create a Discord OAuth 2 App (https://discord.com/developers/applications) and add `https://<yourdomain.tld>/connect/discord/callback` as redirect URL.

Copy `docker-compose.yml` to your webserver with docker and a traefik instance.

Copy `.env.dist` to your server as `.env`

* Set NODE_ENV with `production`
* Set ORIGIN to `https://<yourdomain.tld>/`
* Set DISCORD_KEY and DISCORD_SECRET as provided by Discord

If not done already, see step how to create the map.

Change Host in `docker-compse.yml`

Run `docker compose up -d`

### Access control

After first start it creates a file `./data/allowedUsers.yml`. Using yml so you can add comments!

Edit file and restart server for new permissions to take place. Users probably have to logout/login again.

```yaml
users:
  12345678901234567: full # full access for this user
roles:
  12345678901234569: # Server ID
    12345678901234570: icons # All users with this role, can add/edit icons
    12345678901234571: read # All users with this role, can only view the map
```
