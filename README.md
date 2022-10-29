docker run --rm -v `pwd`/uploads:/tmp/files osgeo/gdal gdal2tiles.py -p raster -w none --tiledriver=WEBP --webp-lossless /tmp/files/railmap.png /tmp/files/
