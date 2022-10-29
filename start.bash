#!/bin/bash

docker build -t born .

docker stop born || true
docker rm born || true

docker run -d \
  -v `pwd`/uploads:/app/uploads \
  -v `pwd`/sessions:/app/sessions \
  -v `pwd`/data:/app/data \
  -p 127.0.0.1:3033:3000 \
  --restart always \
  --env-file .env \
  --name born \
  born