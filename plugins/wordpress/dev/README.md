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
cp rollback-stub.php mu/            # a stand-in for downloads.wordpress.org (rollback)
npx wp-playground-cli server --port 9400 --php 8.3 --wp 6.8 \
  --mount ../mykavo:/wordpress/wp-content/plugins/mykavo \
  --mount ./mu:/wordpress/wp-content/mu-plugins \
  --blueprint ./blueprint.json &

node e2e.cjs ./shots                # 35 steps; screenshots land in ./shots
```

The 1.3.0 features (rollback, automatic rollback, robots.txt rules, plugin
health, AI history, checkout guard, update windows) also have a check that
needs no browser. Start the mock with the token probe/plus.php connects with:

```bash
MOCK_TOKEN=mkv_wp_probe node mock-server.cjs &
node plus.cjs                       # 23 steps, about two minutes
```

The mock starts on a paid plan; `PAID=0` (or `POST /__mock/plan?paid=0`)
switches to the free plan, and `POST /__mock/legacy?on=1` makes it answer like
a MyKavo from before 1.3.0.

Without internet access to wordpress.org, mount a WordPress copy instead of
letting Playground download one: unzip `src/wordpress/wp-6.5.zip` from the
`@wp-playground/wordpress-builds` npm package and add
`--wordpress-install-mode install-from-existing-files --mount-before-install <dir>:/wordpress`.

Log in as `admin` / `password` if you open it yourself.

Use `--php 7.4 --wp 6.2` to check the minimums the plugin declares. Set
`WP_URL` if WordPress runs on another port.

`MYKAVO_APP_URL` is only ever defined for local testing. The released plugin
talks to https://mykavo.app.
