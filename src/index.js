import * as Lightship from "lightship"

const { createLightship: createLightShipInstance } = Lightship

const DEFAULT_PORT = 13000

const create = (
  {
    detectKubernetes,
    port: customPort = DEFAULT_PORT,
    signals,
    terminate,
    gracefulShutdownTimeout,
    enableLog,
    randomPortOnLocal,
  } = { port: DEFAULT_PORT },
) => {
  if (enableLog) process.env.ROARR_LOG = true
  const isOnLocal = !process.env.KUBERNETES_SERVICE_HOST

  if (isOnLocal && !randomPortOnLocal) {
    // mock k8s env to force lightship use config port
    process.env.KUBERNETES_SERVICE_HOST = "kubernetes.default.svc.cluster.local"
  }
  const isTestENV = process.env.NODE_ENV === "test"
  const randomPort =
    ["true", true].includes(process.env.LIGHTSHIP_RANDOM_PORT) || isTestENV

  const lightship = createLightShipInstance({
    ...(detectKubernetes && { detectKubernetes }),
    ...(customPort && { port: customPort }),
    ...(randomPort && { port: 0 }),
    ...(signals && { signals }),
    ...(terminate && { terminate }),
    ...(gracefulShutdownTimeout && { gracefulShutdownTimeout }),
  })
  if (isTestENV) lightship.server.close()

  let createdReadiness
  const wrapLightship = {
    lightship,
    createReadiness: (number = 1) => {
      if (createdReadiness) return createdReadiness
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

      createdReadiness = Array.from(Array(+n), () => {
        const [toReady, toNotReady] = createDeduct()
        const fnName = () => {
          toReady()
          return toNotReady
        }
        fnName.toNotReady = toNotReady
        return fnName
      })
      return createdReadiness
    },
  }

  return wrapLightship
}

export const createLightship = create

export default create
