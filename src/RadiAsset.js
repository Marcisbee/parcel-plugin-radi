const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');
const Logger = require("parcel-bundler/src/Logger");
const radiCompiler = require("./radi-compiler.js");

const babel = require('babel-core');

module.exports = class RadiAsset extends JSAsset {
  constructor(name, pkg, options) {
    super(name, pkg, options);
    this.type = "js";
    this.outputCode = null;
    this.logger = Logger;
  }

  async parse(code) {

    const transformed = radiCompiler(
      code,
      this.basename,
      this.relativeName
    );

    // Replace new code with transformed one
    this.contents = transformed.code;
    this.ast = transformed.ast;
    this.sourceMap = transformed.map;

    return this.ast;
  }

  async generate() {
    // Send to JS bundler
    return [{
      type: 'js',
      value: this.contents,
      sourceMap: this.sourceMap,
    }];
  }

}
