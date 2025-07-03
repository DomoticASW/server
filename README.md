# DomoticASW server

## Npm scripts reference

### `start`

1. Ensures the code compiles
1. Runs [`build-client`](#build-client)
1. Starts a development docker compose environment with multiple emulated devices
1. It runs the server under `nodemon`
1. Stops the development docker compose environment

Subsequent runs will have containers using the same volumes in order to not lose the application state.

#### Configuration

The following environment variables can be used to configure the server:

| Variable       | Default | Explanation                                | Format         |
| -------------- | ------- | ------------------------------------------ | -------------- |
| SERVER_PORT    | 3000    | The port to which bind the web server      | Any valid port |
| DISCOVERY_PORT | 30000   | The port to listen to for device announces | Any valid port |

### `start-clean`

The same as [`start`](#start) but every time it is executed it will clean container volumes in order to start in a clean state.

### `build-client`

Checks if the client is built and ready to be served and if not it launches [`rebuild-client`](#rebuild-client)

### `rebuild-client`

Builds the client to be served by the server

### `lint`

Runs `eslint`

### `test`

1. Ensures the code compiles
1. Starts a testing docker compose environment
1. It runs tests and computes coverage
1. Stops and cleans the testing docker compose enviroment

### `tdd`

The same as [`test`](#test) but it doesn't compute coverage

## Debugging

For debugging purposes multiple console logs can be enabled distincively through boolean environment variables:

| Variable                  | What it does                                                 |
| ------------------------- | ------------------------------------------------------------ |
| LOG_DEVICE_STATUS_CHANGES | Logs every time a device changes its status (Online/Offline) |
| LOG_REQ_URLS              | Logs every request url with the relative http method         |
| LOG_REQ_BODIES            | Logs every request body                                      |
| LOG_ANNOUNCES             | Logs every device announce for discovery                     |
