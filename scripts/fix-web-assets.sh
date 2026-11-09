#!/bin/sh
# Vercel skips any folder named node_modules, so move web assets out of it after `expo export`.
set -e
cd "${1:-dist-web}"
[ -d assets/node_modules ] || exit 0
mv assets/node_modules assets/nm
sed -i 's#/assets/node_modules/#/assets/nm/#g' _expo/static/js/web/*.js
