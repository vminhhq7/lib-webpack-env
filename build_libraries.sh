
cd projects/phoenix-core
# npm version patch 
cd ../../ 
npm run buildlib 
cd dist/phoenix-core/
rm -rf .npmrc 
touch .npmrc

# FEED_URL="https://www.myget.org/F/phoenix-core/npm/"
# KEY=123
# FEED_URL_NO_HTTPS=$(echo ${FEED_URL} | sed -e "s/https://g")
FEED_URL_NO_HTTPS=//npm.pkg.github.com/
# echo "registry=${FEED_URL}" >> .npmrc
# echo "always-auth=true" >> .npmrc
echo "${FEED_URL_NO_HTTPS}:_authToken=${KEY}" >> .npmrc
npm publish