# @rentspree/lightship

A lightship module for support kubernetes liveness and readiness by @rentspree

## Install

```sh
npm install --save @rentspree/lightship
```

## Usage

```javascript
import createLightship from "@rentspree/lightship"

const { createReadiness } = createLightship({ port: 13000 })
const [one, two] = createReadiness(2)
```

## License

MIT © [RentSpree](https://github.com/rentspree)
