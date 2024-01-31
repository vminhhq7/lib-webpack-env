#!/bin/bash

set -e

cwd=`pwd`

docker run --rm -e ENV=${ENVIRONMENT} -e REACT_APP_ENVIROMENT=${ENVIRONMENT} -v "${cwd}":/app -w /app node:10-alpine sh -c "apk add --update git openssh; npm install && npm run buildlib && chmod -R 777 ."

ls -R dist/
