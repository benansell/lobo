"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as sinonChai from "sinon-chai";
import {Builder, BuilderImp, createBuilder} from "../../../lib/builder";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib builder", () => {
  let RewiredBuilder = rewire("../../../lib/builder");
  let builder: BuilderImp;

  beforeEach(() => {
    let rewiredImp = RewiredBuilder.__get__("BuilderImp");
    builder = new rewiredImp();
  });

  describe("createBuilder", () => {
    it("should return builder", () => {
      // act
      let actual: Builder = createBuilder();

      // assert
      expect(actual).to.exist;
    });
  });
});
