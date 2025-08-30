# DomoticASW server

## Setup

```sh
./setup.sh
```

## Configuration

The following environment variables can be used to configure the server (the ones that are mandatory in a production environment are marked with a \*):

| Variable       | Default   | Explanation                                | Format                |
| -------------- | --------- | ------------------------------------------ | --------------------- |
| SERVER_PORT    | 3000      | The port to which bind the web server      | Any valid port        |
| DISCOVERY_PORT | 30000     | The port to listen to for device announces | Any valid port        |
| MONGO_HOST     | localhost | The host on which to find mongodb          | Any valid host string |
| MONGO_PORT     | 27017     | The port on which to find mongodb          | Any valid port        |
| \*JWT_SECRET   | secret    | The secret used to sign JWTs               | Any non empty string  |

## Npm scripts reference

### `start-prod`

1. Compiles the code
1. Runs [`build-client`](#build-client)
1. It runs the server

### `start`

1. Ensures the code compiles
1. Runs [`build-client`](#build-client)
1. Starts a development docker compose environment with multiple emulated devices
1. It runs the server under `nodemon`
1. Stops the development docker compose environment

Subsequent runs will have containers using the same volumes in order to not lose the application state.

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

| Variable                   | What it does                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| LOG_DEVICE_STATUS_CHANGES  | Logs every time a device changes its status (Online/Offline)                                                         |
| LOG_REQ_URLS               | Logs every request url with the relative http method                                                                 |
| LOG_REQ_BODIES             | Logs every request body                                                                                              |
| LOG_ANNOUNCES              | Logs every device announce for discovery                                                                             |
| BASE_DELAY_MS              | Milliseconds of delay to add to every response                                                                       |
| RANDOM_DELAY_MULTIPLIER_MS | Milliseconds to multiply by a random delay from 0 to 1 (ex: 1000 -> delay between 0 and 1s) to add to every response |
