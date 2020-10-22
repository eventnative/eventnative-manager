## Available Scripts

* `yarn install` - get all dependencies (run before any script)
* `yarn start` - dev application (with hot reload) will be started on [http://localhost:3000](http://localhost:3000)
  * `BACKEND_API_BASE=https://app.eventnative.com yarn start` to start frontend with production backend (or specify any other EN helper host)
* `yarn build` - build prod app, see build/ folder for results
* `yarn add` - install and add package

## Troubleshooting

* `rm -rf yarn.lock ./node_modules && yarn install`