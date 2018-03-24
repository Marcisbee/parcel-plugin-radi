const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');

// TODO: write code parsing with babel

module.exports = class RadiAsset extends JSAsset {

  async parse(code) {
    // Extract view part of component
    let view = code.match(/(\<template(.|[\r\n])*?\>([\s\S]+)\<\/template\>)/gmi)[0]
    code = code.replace(view, '')

    var mm = view.match(/\<template(.|[\r\n])*?\>/mi)[0]
      .replace(/(\<template|\>)/g, '')
      .match(/(?:args|arguments)\=[{("]((?:.|[\r\n])*?)[})"]$/i)
    var newargs = mm ? mm[1].replace(/\s/g, '') : 'component,children'

    view = view.replace(/\<template(.|[\r\n])*?\>/, '<section>').replace(/\<\/template\>/, '</section>')

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
    let module = `export default _radi.component({
      props: ${ extract(/props(?:\W|)\{/, -1, '{', '}') },
      state: ${ extract(/state(?:\W|)\{/, -1, '{', '}') },
      actions: ${ extract(/actions(?:\W|)\{/, -1, '{', '}') },
      view: (component, children) => ((${ newargs }) => { return (${ view }); })(component, children),
    })`

    // Replace new code with loaded one
    this.contents = '/** @jsx _radi.r **/\nimport _radi from \'radi\';\n' + code.trim() + '\n\n' + module;

    // Parse through JSAsset
    return super.parse(this.contents);
  }

}
