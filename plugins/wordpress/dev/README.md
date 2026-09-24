# Testing the WordPress plugin locally

Runs a real WordPress with the plugin, against a stand-in for mykavo.app, and
walks the whole journey in a browser.

```bash
cd plugins/wordpress/dev
npm install --no-save playwright @wp-playground/cli

node make-sample-shots.cjs          # sample before/after/diff screenshots
node mock-server.cjs &              # stand-in mykavo.app on 127.0.0.1:9501

# WordPress on 127.0.0.1:9400 with the plugin mounted and activated.
# probe/ goes in a mu-plugins SUBFOLDER, which WordPress does not auto-load:
# the e2e test calls probe/fake-update.php to simulate a plugin update.
mkdir -p mu/probe && echo "<?php define( 'MYKAVO_APP_URL', 'http://127.0.0.1:9501' );" > mu/mykavo-dev.php
cp probe/*.php mu/probe/
cp woo-stub.php mu/                 # a stand-in for WooCommerce's store pages
npx wp-playground-cli server --port 9400 --php 8.3 --wp 6.8 \
  --mount ../mykavo:/wordpress/wp-content/plugins/mykavo \
  --mount ./mu:/wordpress/wp-content/mu-plugins \
  --blueprint ./blueprint.json &

node e2e.cjs ./shots                # 31 steps; screenshots land in ./shots
```

Log in as `admin` / `password` if you open it yourself.

Use `--php 7.4 --wp 6.2` to check the minimums the plugin declares. Set
`WP_URL` if WordPress runs on another port.

`MYKAVO_APP_URL` is only ever defined for local testing. The released plugin
talks to https://mykavo.app.
