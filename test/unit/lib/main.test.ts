"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as sinonChai from "sinon-chai";
import {createLobo, Lobo, LoboImp} from "../../../lib/main";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib main", () => {
  let RewiredBuilder = rewire("../../../lib/main");
  let lobo: LoboImp;

  beforeEach(() => {
    let rewiredImp = RewiredBuilder.__get__("LoboImp");
    lobo = new rewiredImp();
  });

  describe("createMain", () => {
    it("should return main", () => {
      // act
      let actual: Lobo = createLobo();

      // assert
      expect(actual).to.exist;
    });
  });
});
