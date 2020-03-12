import { createLightship } from "lightship"

const create = ({
  detectKubernetes,
  port = 13000,
  signals,
  terminate,
  gracefulShutdownTimeout,
}) => {
  const lightship = createLightship({
    ...(detectKubernetes && { detectKubernetes }),
    ...(port && { port }),
    ...(signals && { signals }),
    ...(terminate && { terminate }),
    ...(gracefulShutdownTimeout && { gracefulShutdownTimeout }),
  })

  const wrapLightship = {
    lightship,
    createReadiness: (number = 1) => {
      let n = number
      const createDeduct = () => {
        let isReady = false

        const toNotReady = () => {
          if (isReady) {
            isReady = false
            n += 1
            lightship.signalNotReady()
          }
        }

        const toReady = () => {
          if (!isReady) {
            isReady = true
            n -= 1
            if (n <= 0) {
              lightship.signalReady()
            }
          }
        }

        return [toReady, toNotReady]
      }

      return Array.from(Array(+n), () => {
        const [toReady, toNotReady] = createDeduct()
        const fnName = () => {
          toReady()
          return toNotReady
        }
        fnName.toNotReady = toNotReady
        return fnName
      })
    },
  }

  return wrapLightship
}

export default create
