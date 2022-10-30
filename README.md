docker run --rm -v `pwd`/uploads:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w openlayers --tiledriver=WEBP --webp-lossless /tmp/files/railmap.png /tmp/files/
