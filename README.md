# @rentspree/lightship

A lightship module for support kubernetes liveness and readiness by @rentspree

Description
---------------

This module is a simple wrapper of the original [lightship](https://github.com/gajus/lightship#readme) library which helps to easily initialize the ready callback functions for multiple source of `ready` interconnected services being used by the application (eg. database) or configuration loading of the application.

## Features
 - add `createReadiness` which help to split lightship `signalReady` to multiple functions
 - server exposes on paths `/health` `/live`  and `/ready` as the original lightship does but listen on port `13000` by default
 - add `enableLog` option to print lightship logs
 - add `randomPortOnLocal` to reserve random port behavior when the process is run on local as the original lightship does, default to `false`

## Install

```sh
npm install --save @rentspree/lightship
```

## Usage

#### Readiness

```javascript
import createLightship from "@rentspree/lightship"

const { createReadiness } = createLightship()
const [ mongooseDbReady, expressReady, senecaReady ] = createReadiness(3)

// for mongoose connection
mongoose.connect(/* connectionString */)
mongoose.connection.on('connected', ()=> mongooseDbReady())

// for express
const app = express();
app.listen(3000, ()=> expressReady())

// for seneca
require('seneca')({ some_options: 123 })
  .use('community-plugin-1', {some_config: SOME_CONFIG})
  .use('community-plugin-2')
  .listen(/* ... */)
  .client(/* ... */)
  .ready(()=> senecaReady())
```

in case of making service back to not ready state, we get functions by 2 ways ..
```javascript
const [ mongooseDbReady ] = createReadiness()

// first way, return from ready function call
const mongooseNotReady = mongooseDbReady()
mongooseNotReady()

// second way, by property `toNotReady` of ready function
mongooseDbReady.toNotReady()
```

## License

MIT © [RentSpree](https://github.com/rentspree)
