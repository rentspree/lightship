// import stdMocks from "std-mocks"
// import sinon from "sinon"
import chai from "chai"
import createLightship from "../src"

// const { should } = chai
chai.should()

const { createReadiness } = createLightship({})

describe("createLightship", () => {
  beforeEach(() => {})
  afterEach(() => {})
  it("should call createReadiness and return length correctly", () => {
    createReadiness(2).should.have.length(2)
  })
})
