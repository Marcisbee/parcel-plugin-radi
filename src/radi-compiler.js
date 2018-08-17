const babel = require('babel-core');

module.exports = (code, basename, relativeName) => {
  const name = basename.split('.')[0];
  let parsed = code.replace(/(?:^|\s)*(class[\s]*\{)/, (match, text) => {
    return match.replace(text, 'export default class '+name+' extends Radi.Component {');
  });

  let transformed = babel.transform(parsed, {
    filename: basename,
    filenameRelative: relativeName,
    sourceMapTarget: relativeName,
    sourceMaps: true,
    plugins: [
      [require('babel-plugin-transform-class-properties')],
      [require('babel-plugin-syntax-pipeline').default],
      [require('babel-plugin-transform-pipeline-operator')],
      [require('babel-plugin-transform-decorators-legacy').default],
      [require("./babel-transform-radi"), {}],
      [require('babel-plugin-transform-react-jsx'), {
        pragma: 'Radi.r'
      }],
      [require('babel-plugin-transform-radi-listen'), {
        pragma: 'Radi.l'
      }]
    ]
  });

  return transformed;
};
