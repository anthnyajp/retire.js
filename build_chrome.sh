#!/bin/sh
set -e

if [ -d "node" ]; then
  cd node
  npm install
  npm run build
  cd ..
else
  echo "Error: 'node' directory does not exist."
  exit 1
fi

if [ -d "chrome/build" ]; then
  cd chrome/build
  npm install
  npm run build
  cd ../..
else
  echo "Error: 'chrome/build' directory does not exist."
  exit 1
fi

echo "Done!"
