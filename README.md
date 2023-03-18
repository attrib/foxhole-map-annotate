# Foxhole Map Annotate

Annotate and draw on the foxhole map and share with your group.

## Bugs

Please create a Ticket in GitHub. Or of any the discord where you maybe heard about this tool.

* Private/Public/Enemy Slider on iPad doesn't show correctly
* Facilities not displayed in some strange context
* scissor requires a reload to show the new line (by [FMAT] Quini98 - https://discord.com/channels/895735519231762432/1042389158334844948/1067520074040225912)
* The Attachment point (the blue dot thingy) isn't on the line itself. Very hard to move the line this way (by [FMAT] Quini98)

## Todos

* Require text for custom area (by [11eFL] mashed)

## Ideas

* Check auth more often (by [1erBH] Fran-T4NK)
* Fuse lines (by [11eFL] mashed)
* Remove flags as mods - consider item as okay (by [11eFL] mashed)
* separate icon for fire rockets (by [11eFL] mashed)
* Icon for obs bunker (by DMJaxun)
* Sort Flagged by time flagged
* Add other shapes next to polygon (rectangle, circle) (by Morgeta)
* Image/Screenshot upload (compressor.js) (by Phalanx/Bazlow)
* Filter Planned/Built Rails (by [102nd] Asterム)
* Hide icons inside areas and show them when area is selected (by [11eFL] mashed)
* [Measure Tool](https://viglino.github.io/ol-ext/examples/popup/map.tooltip.measure.html) (by felipipe, Morgeta) - (Hex length 1.89km, width 2.184km)
* watch towers / relics / town halls / ... radius (by Morgeta)
  * Watchtower: 80 meters
  * Safehouse if radio station teched: 80 meters
  * Observation Bunker T2: 130-156 meters
  * Observation Bunker T3: 180-216 meters
  * Observation Tower: 240 meters
* Free Hand drawing (by [RDRT] A Devil Chicken)
* auto expiring icons (by [CHI] Arctifire)
* 'suggested' placement of icons by lower clearance users, to be approved by 'edit' clearance users (by [FMAT] Da Vinci)
* comments for signs (by [FMAT] Da Vinci)
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
* Dedicated text box on the map (by [✚RMC✚] EllieTau (QM))
* Clan feature? A way to allow others to edit your features? maybe allow full access of same server to allow editing of same server?
* public activity log
* Mobile edit support
* Rotate icons (by [FMAT] Zeenz)

## DevTodos

* 

## Run Dev

Copy `.env.dist` to `.env`

Create the map tiles

```bash
cd public
mkdir map
cd map
wget https://cdn.discordapp.com/attachments/1003485765273145424/1039646692095574046/entiremap.png
docker run --rm -v `pwd`:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w openlayers --tiledriver=WEBP --webp-lossless /tmp/files/entiremap.png /tmp/files/
```

If you are using Windows Powershell and Docker on Windows

```powershell
docker run --rm -v ${PWD}:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w openlayers --tiledriver=WEBP --webp-lossless /tmp/files/entiremap.png /tmp/files/
```

Install dependencies and run dev mode

```bash
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
