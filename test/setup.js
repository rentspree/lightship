/* eslint-disable import/no-extraneous-dependencies */
import chai from "chai"
import sinonChai from "sinon-chai"
import chaiAsPromised from "chai-as-promised"
import chaid from "chaid"

chai
  .use(sinonChai)
  .use(chaiAsPromised)
  .use(chaid)
