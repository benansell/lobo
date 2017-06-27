"use strict";

import * as chai from "chai";
import rewire = require("rewire");
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {createReporter, Reporter, ReporterImp} from "../../../lib/reporter";
import {PluginReporter, ProgressReport} from "../../../lib/plugin";

let expect = chai.expect;
chai.use(sinonChai);

describe("lib", () => {
  describe("reporter", () => {
    let RewiredReporter = rewire("./../../../lib/reporter");
    let reporter: ReporterImp;

    beforeEach(() => {
      let rewiredImp = RewiredReporter.__get__("ReporterImp");
      reporter = new rewiredImp();
    });

    describe("createReporter", () => {
      it("should return reporter", () => {
        // act
        let actual: Reporter = createReporter();

        // assert
        expect(actual).to.exist;
      });
    });

    describe("update", () => {
      let mockReporterPlugin: PluginReporter;

      beforeEach(() => {
        mockReporterPlugin = <any> sinon.spy();
        mockReporterPlugin.update = sinon.spy();
        reporter.configure(mockReporterPlugin);
      });

      it("should report nothing when program.quiet is true", () => {
        // arrange
        RewiredReporter.__set__({program: {quiet: true}});

        // act
        reporter.update(<ProgressReport> {resultType: "PASSED"});

        // assert
        expect(mockReporterPlugin.update).not.to.have.been.called;
      });

      it("should call reporter.update when program.quiet is false", () => {
        // arrange
        RewiredReporter.__set__({program: {quiet: false}});

        // act
        reporter.update(<ProgressReport> {resultType: "PASSED"});

        // assert
        expect(mockReporterPlugin.update).to.have.been.called;
      });
    });
  });
});
