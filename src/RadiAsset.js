const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');
const Logger = require("parcel-bundler/src/Logger");
const radiParser = require("./radi-compiler.js");

var babel = require('babel-core');

module.exports = class RadiAsset extends JSAsset {
  constructor(name, pkg, options) {
    super(name, pkg, options);
    this.type = "js";
    this.outputCode = null;
    this.logger = Logger;
  }

  async parse(code) {

    const name = this.basename.split('.')[0];
    let parsed = code.replace(/(?:^|\s)*(class[\s]*\{)/, (match, text) => {
      return match.replace(text, 'export default class '+name+' extends Radi.Component {');
    })

    let transformed = babel.transform(parsed, {
      filename: this.basename,
      filenameRelative: this.relativeName,
      sourceMapTarget: this.relativeName,
      sourceMaps: true,
      plugins: [
        [require('babel-plugin-transform-class-properties')],
        [require('babel-plugin-syntax-pipeline').default],
        [require('babel-plugin-transform-pipeline-operator')],
        [require('babel-plugin-transform-decorators-legacy').default],
        [radiParser, {}],
        [require('babel-plugin-transform-react-jsx'), {
          pragma: 'Radi.r'
        }],
        [require('babel-plugin-transform-radi-listen'), {
          pragma: 'Radi.l'
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
