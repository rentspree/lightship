import request from "supertest"
import isArray from "lodash/isArray"
import createLightship from "../src"

describe("createLightship", () => {
  describe("#Default Configuration", () => {
    let server
    before(done => {
      const customLightShip = createLightship()
      server = customLightShip.lightship.server
      server.once("listening", () => {
        done()
      })
    })
    after(() => {
      server.close()
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
    afterEach(() => {
      server.close()
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
    describe("#Multiple Ready Calls", () => {
      it("should return Array<Function> type which has length matching to the parameter sent", async () => {
        const returnVal = createReadiness(3)
        isArray(returnVal).should.equal(true)
        returnVal.should.have.property("length").which.equal(3)
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
        // eslint-disable-next-line no-unused-vars
        const [dbReady, expressReady, senecaReady] = createReadiness(3)
        dbReady()
        expressReady()
        await serverMustNotReady(server)
      })
      it("should not make lightship to be ready state when there is some returned function is not called even when the other functions are called multiple times", async () => {
        await serverMustNotReady(server)
        // eslint-disable-next-line no-unused-vars
        const [dbReady, expressReady, senecaReady] = createReadiness(3)
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
