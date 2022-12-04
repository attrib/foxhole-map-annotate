# Foxhole Map Annotate

Annotate and draw on the foxhole map and share with your group.

## Bugs

Please create a Ticket in GitHub. Or of any the discord where you maybe heard about this tool.

## Ideas

* victory townhalls?
* [Measure](https://viglino.github.io/ol-ext/examples/popup/map.tooltip.measure.html) (by felipipe) - length 1.89km, width 2.184km
* Partisan Rails? (new Role, Green Rail)
* Popup rework?
  * [Hover](https://viglino.github.io/ol-ext/examples/interaction/map.interaction.hover.html)
  * [Popup](http://viglino.github.io/ol-ext/examples/popup/map.popup.html)
  * [Animated Popup](http://viglino.github.io/ol-ext/examples/popup/map.popup.anim.html)
  * [Popup Feature](https://viglino.github.io/ol-ext/examples/popup/map.popup.feature.html)
* paste text and create icons from it (FarranacCoastG11k2, (iconType), (note)) (by [SOS] Yabba)
* move help section into main page with layers you can open (by [RDRT] A Devil Chicken)
* background pattern custom facility
* more line options (Enemy logi route, partisan route) (by Bazlow, [TSAR]orb)
* checkpoint marker (by [HAULR] Barteng)
* public oil marker (by [HAULR] Barteng)
* public water marker  (by [HAULR] Barteng)
* Dedicated text box on the map (by [✚RMC✚] EllieTau (QM))
* auto expiring icons (by [CHI] Arctifire) 
* Clan feature? A way to allow others to edit your features? maybe allow full access of same server to allow editing of same server?
* public activity log
* add current VP count to navbar

## DevTodos

* Rework WebSockets to allow partial updates (localStorage?) 
* discord bot? for better ACL?

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

If not done already, see step how to create the map.

Change Host in `docker-compse.yml`

Run `docker compose up -d`

It will create a `data/config.yml`, please change all values there and then restart the app. 

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
