const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');
const Logger = require("parcel-bundler/src/Logger");
const radiParser = require("./radi-compiler.js");

var babel = require('babel-core');
var raditransform = require('babel-plugin-transform-radi-listen');

// TODO: Build real source maps for template

module.exports = class RadiAsset extends JSAsset {
  constructor(name, pkg, options) {
    super(name, pkg, options);
    this.type = "js";
    this.outputCode = null;
    this.logger = Logger;
  }

  async parse(code) {

    let parsed = radiParser(this.basename.split('.')[0], code)

    let transformed = babel.transform(parsed, {
      filename: this.basename,
      filenameRelative: this.relativeName,
      sourceMapTarget: this.relativeName,
      sourceMaps: true,
      plugins: [
        'transform-pipeline-operator',
        'transform-decorators-legacy',
        ['transform-react-jsx', {
          pragma: '_radi.r'
        }],
        [raditransform, {
          pragma: '_radi.l'
        }]
      ]
    })

    // Replace new code with loaded one
    this.contents = transformed.code;
    this.sourceMap = transformed.map;

    return await super.parse(this.contents);
  }

  async generate() {
    // Send to JS bundler
    return {
      js: this.contents,
      map: this.sourceMap,
    };
  }

}
