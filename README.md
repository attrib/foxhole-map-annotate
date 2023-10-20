# Foxhole Map Annotate

Annotate and draw on the foxhole map and share with your group.

## Bugs

Please create a Ticket in GitHub. Or of any the discord where you maybe heard about this tool.

* Private/Public/Enemy Slider on iPad doesn't show correctly
* Facilities not displayed in some strange context
* The Attachment point (the blue dot thingy) isn't on the line itself. Very hard to move the line this way (by [FMAT] Quini98)

* admin save error
* edit not working?
* html entities in text

## Todos

* Require text for custom area (by [11eFL] mashed)

## Ideas

* option to toggle all in the layer filters (by [11eFL] mashed)
* special icon only visible to admins for easier coordination (by [11eFL] mashed)
* Upkeep Modifier for each voroni chunk (Very Good 0.25, Good 0.5, Poor 1, Very Poor 2)
* Check auth more often (by [1erBH] Fran-T4NK)
* separate icon for fire rockets (by [11eFL] mashed)
* Icon for obs bunker (by DMJaxun)
* Add other shapes next to polygon (rectangle, circle) (by Morgeta)
* Image/Screenshot upload (compressor.js) (by Phalanx/Bazlow)
* Filter Planned/Built Rails (by [102nd] Asterム)
* Hide icons inside areas and show them when area is selected (by [11eFL] mashed)
* Free Hand drawing (by [RDRT] A Devil Chicken)
* auto expiring icons (by [CHI] Arctifire, [11eFL] mashed)
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

## Draft System

* TBD time each draft

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
