const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');

var babel = require('babel-core');
var raditransform = require('./radi-transform.js');

// TODO: write code parsing with babel

const NODES = /<([A-Z][A-Z0-9\-]*)\b[^>]*>[\s\S]*<\/\1>/gi;
const COMMENTS = /((?:\/\*(?:[^*]|[\r\n]|(?:\*+([^*\/]|[\r\n])))*\*+\/)|(?:\/\/.*))/g;
// const ACTIONS = /(\@action[\s]+[a-zA-Z0-9_]+)[\s:]*(?:\(|\)|[a-zA-Z0-9_,])+[\s:]*[=>]*[\s:]*/g;
// const DECORATORS = /\@([a-zA-Z0-9_]+)[\s]+([a-zA-Z0-9_]+[^\s:(])/g;
// const DECORATORS = /\@(action)[\s]+([a-zA-Z0-9_]+[^\s:(])/g;
// const FN_ARROW = /(?:\s*\(?(?:\s*\w*\s*,?\s*)*\)?\s*?=>\s*)/g;
// const BRACKETS = /[{};]/g;
const IMPORTS = /(import\s+([\S,* ]+|\*\s+as\s+\S+|\{[^\}]*\})(\s+from)\s+[\S]*[\s;]+|import\s+[\S,* ]+)/g;

module.exports = class RadiAsset extends JSAsset {

  async parse(code) {
    // Extract view part of component
    let noComments = code.replace(COMMENTS, '');
    let view = noComments.match(NODES) || [];

    // Need to remove those newly found parts from code
    code = code.replace(NODES, '');

    let imports = noComments.match(IMPORTS) || [];
    code = code.replace(IMPORTS, '');

    // Extracts classes and contents from code
    const extract = (find, mod, first, last, cb) => {
      var L = first.charCodeAt(0)
      var R = last.charCodeAt(0)

      var match = code.match(find)
      if (!match) return first + last
      var indexState = match.index + (match[0]).length

      var diff = 1
      var endIndex = 0

      for (var i = indexState; i <= code.length; i++) {
        if (code.charCodeAt(i) === L) diff += 1
        else if (code.charCodeAt(i) === R) diff -= 1

        if (diff === 0) {
          endIndex = i + 1
          break;
        }
      }

      var out = code.substring(indexState + mod, endIndex)

      code = code.substr(0, match.index).concat(code.substring(endIndex, code.length))

      return out
    }

    // Build new code
    const classState = extract(/state(?:\s|:)+\{/, -1, '{', '}');
    const classOn = extract(/on(?:\s|:)+\{/, -1, '{', '}');


    // TODO: Check only base expressions
    // var regExp = /[\{\}\;]/g, match;
    // var L = '{'.charCodeAt(0);
    // var R = '}'.charCodeAt(0);
    //
    // var baseExpressions = [];
    // var baseExpressionPos = [];
    //
    // var count = 0;
    // var pos = {l:null, r:null};
    //
    // while (match = regExp.exec(code)) {
    //   if (match[0] === '{') {
    //     if (pos.l === null) pos.l = match.index
    //     count += 1
    //   }
    //   if (match[0] === '}') {
    //     count -= 1
    //   }
    //
    //   if (count == 0) {
    //     pos.r = match.index;
    //     baseExpressions.push(code.substring(pos.l + 1, pos.r));
    //     baseExpressionPos.push([pos.l + 1, pos.r]);
    //     pos = {l:null, r:null};
    //     count = 0;
    //   }
    // }
    //
    // console.log('baseExpressions', baseExpressionPos);


    // Build new code
    let module = `/** @radi-listen _radi.l **/
    export default class extends _radi.component {
      constructor() {
        super();
        this.state = ${ classState || {} }
        this.on = ${ classOn || {} }
      }

      ${ code.trim() }

      view() {
        const component = this;
        return <template>\n${ view.join('') }\n</template>;
      }
    }`

    module = babel.transform(module, {
      plugins: [
        'transform-decorators-legacy',
        ['transform-react-jsx', {
          pragma: '_radi.r'
        }],
        [raditransform, {
          pragma: '_radi.l'
        }]
      ]
    }).code

    // console.log(module)

    // Replace new code with loaded one
    this.contents = '/** @jsx _radi.r **/\nimport _radi from \'radi\';\nconst action = _radi.action;\n' + imports.join('\n').trim() + '\n\n' + module;

    // Parse through JSAsset
    return super.parse(this.contents);
  }

}
