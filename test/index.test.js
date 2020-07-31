/* eslint-disable no-unused-expressions */
import request from "supertest"
import isArray from "lodash/isArray"
import chai from "chai"
import createLightship from "../src"

const { should } = chai
describe("createLightship", () => {
  describe("#Default Configuration", () => {
    let server

    beforeEach(done => {
      const customLightShip = createLightship()
      server = customLightShip.lightship.server
      server.once("listening", () => {
        done()
      })
    })
    afterEach(done => {
      server.close(done)
    })
    it("should start server at default port 13000 even when in local mode", () => {
      server.address().port.should.be.equal(13000)
    })
    describe("#Liveness", () => {
      it("should expose path /live with return status code 200", () =>
        request(server)
          .get("/live")
          .send()
          .expect(200))
    })

    describe("#Readiness", () => {
      it("should expose path /ready with default to return status code 500", () =>
        request(server)
          .get("/ready")
          .send()
          .expect(500))
    })
  })
  describe("#Options", () => {
    afterEach(() => {
      delete process.env.ROARR_LOG
      delete process.env.KUBERNETES_SERVICE_HOST
      delete process.env.NODE_ENV
      delete process.env.LIGHSHIP_RANDOM_PORT
    })
    describe("#enableLog option", () => {
      it("should set process.env.ROARR_LOG to true", async () => {
        const { lightship } = createLightship({ enableLog: true })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.close()
        process.env.ROARR_LOG.should.equal("true")
      })
    })

    describe("#randomPortOnLocal LIGHTSHIP_RANDOM_PORT=true and NODE_ENV=test option", () => {
      it("should set process.env.KUBERNETES_SERVICE_HOST when randomPortOnLocal is not set and run on local", async () => {
        const { lightship } = createLightship()
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })
        process.env.KUBERNETES_SERVICE_HOST.should.not.be.undefined
      })

      it("should random port on local if randomPortOnLocal is set to true", async () => {
        const { lightship } = createLightship({
          port: 12000,
          randomPortOnLocal: true,
        })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.address().port.should.not.equal(12000)
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })
        should().equal(process.env.KUBERNETES_SERVICE_HOST, undefined)
      })

      it("should not interfere to KUBERNETES_SERVICE_HOST environment value if it's running in k8s cluster", async () => {
        process.env.KUBERNETES_SERVICE_HOST = "cluster-value"
        const { lightship } = createLightship({
          port: 12000,
          randomPortOnLocal: true,
        })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.address().port.should.equal(12000)
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })
        process.env.KUBERNETES_SERVICE_HOST.should.equal("cluster-value")
      })

      it("should close server immediately from the start when process.env.NODE_ENV=test", async () => {
        process.env.NODE_ENV = "other"
        const { lightship } = createLightship({ port: 12300 })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.address().port.should.equal(12300)
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })

        process.env.NODE_ENV = "test"
        const { lightship: lightship2 } = createLightship({ port: 12300 })
        await new Promise(resolve => {
          lightship2.server.once("close", () => resolve())
        })
      })

      it("should random port if process.env.LIGHTSHIP_RANDOM_PORT=true", async () => {
        process.env.LIGHTSHIP_RANDOM_PORT = "truee"
        const { lightship } = createLightship({ port: 12300 })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.address().port.should.equal(12300)
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })

        process.env.LIGHTSHIP_RANDOM_PORT = "true"
        const { lightship: lightship2 } = createLightship({ port: 13100 })
        await new Promise(resolve => {
          lightship2.server.once("listening", () => resolve())
        })
        lightship2.server.address().port.should.not.equal(13100)
        await new Promise(resolve => {
          lightship2.server.close(() => resolve())
        })

        process.env.LIGHTSHIP_RANDOM_PORT = true
        const { lightship: lightship3 } = createLightship({ port: 13200 })
        await new Promise(resolve => {
          lightship3.server.once("listening", () => resolve())
        })
        lightship3.server.address().port.should.not.equal(13200)
        await new Promise(resolve => {
          lightship3.server.close(() => resolve())
        })
      })

      it("should random port if process.env.LIGHTSHIP_RANDOM_PORT=true even when service is running on k8s", async () => {
        process.env.LIGHTSHIP_RANDOM_PORT = "true"
        process.env.KUBERNETES_SERVICE_HOST = "cluster-value"
        const { lightship } = createLightship({ port: 12000 })
        await new Promise(resolve => {
          lightship.server.once("listening", () => resolve())
        })
        lightship.server.address().port.should.not.equal(12000)
        await new Promise(resolve => {
          lightship.server.close(() => resolve())
        })
        process.env.KUBERNETES_SERVICE_HOST.should.equal("cluster-value")
      })
    })
  })

  describe("#CreateReadiness", () => {
    let server
    let createReadiness
    const serverMustReady = s =>
      request(s)
        .get("/ready")
        .send()
        .expect(200)
    const serverMustNotReady = s =>
      request(s)
        .get("/ready")
        .send()
        .expect(500)
    beforeEach(done => {
      const customLightShip = createLightship()
      server = customLightShip.lightship.server
      createReadiness = customLightShip.createReadiness
      server.once("listening", () => {
        done()
      })
    })
    afterEach(done => {
      server.close(done)
    })
    describe("#Behavior", () => {
      it("should return Array<Function> type, default to length 1", () => {
        const returnVal = createReadiness()
        isArray(returnVal).should.equal(true)
        returnVal.should.have.property("length").which.equal(1)
      })
      it("should make lightship to be ready state when the returned function is called", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        toReady()
        await serverMustReady(server)
      })
      it("should make lightship to be ready state when the returned function is called more than 1 time", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        toReady()
        toReady()
        await serverMustReady(server)
      })
      it("should make lightship back to unready state when a result return from the returned function is called", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        const toNotReady = toReady()
        await serverMustReady(server)
        toNotReady()
        await serverMustNotReady(server)
      })
      it("should make lightship back to unready state when a result return from the returned function is called more than 1 time", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        const toNotReady = toReady()
        await serverMustReady(server)
        toNotReady()
        toNotReady()
        await serverMustNotReady(server)
      })
      it("should make lightship to ready again if the ready function is called", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        const toNotReady = toReady()
        await serverMustReady(server)
        toNotReady()
        await serverMustNotReady(server)
        toReady()
        await serverMustReady(server)
      })
      it("should make lightship back to unready state when a nested property 'toNotReady' of returned function is called", async () => {
        await serverMustNotReady(server)
        const [toReady] = createReadiness()
        const { toNotReady } = toReady
        toReady()
        await serverMustReady(server)
        toNotReady()
        await serverMustNotReady(server)
      })
    })
    describe("#Multiple Readiness Handlers", () => {
      it("should return Array<Function> type which has length matching to the parameter sent", async () => {
        const returnVal = createReadiness(3)
        isArray(returnVal).should.equal(true)
        returnVal.should.have.property("length").which.equal(3)
      })
      it("should have tolerance to multiple calls by only first time called is actually made", async () => {
        const returnVal = createReadiness(3)
        isArray(returnVal).should.equal(true)
        returnVal.should.have.property("length").which.equal(3)
        const returnVal2 = createReadiness(10)
        isArray(returnVal2).should.equal(true)
        returnVal2.should.have.property("length").which.equal(3)
        returnVal.push(() => "this-is-mutation")
        const [, , , newFn] = returnVal2
        newFn().should.equal("this-is-mutation")
      })
      it("should make lightship to be ready state when every returned function is called", async () => {
        await serverMustNotReady(server)
        const [dbReady, expressReady, senecaReady] = createReadiness(3)
        dbReady()
        expressReady()
        senecaReady()
        await serverMustReady(server)
      })
      it("should not make lightship to be ready state when there is some returned function is not called", async () => {
        await serverMustNotReady(server)
        const [dbReady, expressReady] = createReadiness(3)
        dbReady()
        expressReady()
        await serverMustNotReady(server)
      })
      it("should not make lightship to be ready state when there is some returned function is not called even when the other functions are called multiple times", async () => {
        await serverMustNotReady(server)
        const [dbReady, expressReady] = createReadiness(3)
        dbReady()
        dbReady()
        expressReady()
        expressReady()
        expressReady()
        await serverMustNotReady(server)
      })
      it("should make lightship back to unready state after one of the toNotReady function is called", async () => {
        await serverMustNotReady(server)
        const [dbReady, expressReady, senecaReady] = createReadiness(3)
        dbReady()
        expressReady()
        senecaReady()
        await serverMustReady(server)
        expressReady.toNotReady()
        await serverMustNotReady(server)
      })
      it("should make lightship back to ready state after be unready correctly by multiple toNotReady handlers calling", async () => {
        await serverMustNotReady(server)
        const [dbReady, expressReady, senecaReady] = createReadiness(3)
        dbReady()
        expressReady()
        senecaReady()
        await serverMustReady(server)
        expressReady.toNotReady()
        await serverMustNotReady(server)
        dbReady.toNotReady()
        await serverMustNotReady(server)
        expressReady()
        expressReady()
        await serverMustNotReady(server)
        dbReady()
        await serverMustReady(server)
      })
    })
  })
})
