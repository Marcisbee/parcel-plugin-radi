const FINDTOKENS = /__RTOKEN-([A-Za-z0-9-_]+):([0-9]+);/g;

const definitions = {
  comment: {
    regex: /((?:\/\*(?:[^*]|[\r\n]|(?:\*+([^*\/]|[\r\n])))*\*+\/)|(?:\/\/.*))/,
  },
  state: {
    regex: /(?:^|\s)state(?:\s|:|)+\{/,
    extract: [-1, '{', '}'],
  },
  on: {
    regex: /(?:^|\s)on(?:\s|:|)+\{/,
    extract: [-1, '{', '}'],
  },
  node: {
    // regex: /(?:{\/\*[^\*]+?\*\/\}|<([A-Za-z][A-Za-z0-9-_]*?)(?:\/>|\b[^>]*>([^<\/]*?|[\s\S]+?)<\/\1>))/,
    regex: /[^\( \{\'\"](?:{\/\*[^\*]+?\*\/\}|<([A-Za-z][A-Za-z0-9-_]*?)(?:\/>|\b[^>]*>(?:[^{]+({[\s\S]*[^}]+})[^<\\]+|([^<\/]*?|[\s\S]+?))<\/\1>))/,
    custom: input => input.replace(/this\.state/g, 'component.state'),
  },
  method: {
    // regex: /(?:(@[\w]+|[\w]+)*[^\b])(\w+)\s*\([^)]*\)\s*({(?:{[^{}]*(?:{[^{}]*}|[\s\S])*?[^{}]*}|[\s\S])*?})/,
    regex: /(?:(?:@[\w.]+|[\w]+)*[^\b])(?:\w+)\s*\([^)]*\)\s*\{/,
    extract: [-1, '{', '}'],
    matchToo: true,
    multiple: true,
  },
  // method: /(?:(@[\w]+|[\w]+)*[^\b])(\w+)\s*\([^)]*\)\s*({(?:{[^{}]*(?:{[^{}]*}|[\s\S])*?[^{}]*}|[\s\S])*?})/,
  // function: /(\w+)\s*\([^)]*\)\s*({(?:{[^{}]*(?:{[^{}]*}|[\s\S])*?[^{}]*}|[\s\S])*?})/,
}

let savedTokens = {}

const template = ({
    on,
    state,
    method,
    node,
  }, name, outside) => (`
  /** @jsx _radi.r **/
  /** @radi-listen _radi_listen **/

  import _radi from 'radi';
  const action = _radi.action;
  const subscribe = _radi.subscribe;
  const worker = _radi.worker;
  const _radi_listen = _radi.listen;

  ${outside || ''}

  export default class ${name || ''} extends _radi.Component {
    constructor(...args) {
      super(...args);
      this.state = ${state || '{}'};
      this.on = ${on || '{}'};
    }

    ${method ? method.join('\n\n') : ''}

    ${node && (
      `view() {
        const component = this;
        return [${node.join(', ')}];
      }`
    ) || ''}

  };
`).trim()

const remapCode = input => {
  let output = input.replace(FINDTOKENS, (match, type, id) => {
    return savedTokens[type][id].match
  })
  return output === input ? output : remapCode(output)
}

const rebuild = (code, name) => {
  let out = {}
  let output = code.replace(FINDTOKENS, (match, type, id) => {
    if (typeof out[type] === 'undefined') out[type] = []
    out[type].push(
      remapCode(savedTokens[type][id].match)
    )
    return ''
  }).trim()

  return template(out, name, output)
}

const parse = (name, code, cb) => {

  savedTokens = {}

  const saveToken = (type, contents, match, input) => {
    if (typeof savedTokens[type] === 'undefined') savedTokens[type] = []
    if (typeof definitions[type].custom === 'function') {
      match = definitions[type].custom(match);
      input = definitions[type].custom(input);
    }
    let i = savedTokens[type].push({
      type,
      contents: contents,
      match,
      input,
    });
    return `__RTOKEN-${type}:${i-1};`;
  }

  const tokenize = (type, CODE) => {
    let replaced = CODE.replace(definitions[type].regex, (match, ...contents) => {
      let input = contents.splice(-1)[0]
      let offset = contents.splice(-1)[0]
      return saveToken(type, [...contents], match, input)
    })
    return replaced === CODE ? CODE : tokenize(type, replaced)
  }

  // Extracts classes and contents from code
  const extract = (type, CODE) => {
    const find = definitions[type].regex
    const [
      mod,
      first,
      last,
    ] = definitions[type].extract

    var L = first.charCodeAt(0)
    var R = last.charCodeAt(0)

    var match = CODE.match(find)
    if (!match) return CODE
    var indexState = match.index + (match[0]).length

    var diff = 1
    var endIndex = 0

    for (var i = indexState; i <= CODE.length; i++) {
      if (CODE.charCodeAt(i) === L) diff += 1
      else if (CODE.charCodeAt(i) === R) diff -= 1

      if (diff === 0) {
        endIndex = i + 1
        break;
      }
    }

    let out = CODE.substring(indexState + (definitions[type].matchToo ? -(match[0]).length : mod), endIndex)

    let tokenID = saveToken(type, ['state'], out, out)

    let input = CODE.substr(0, match.index).concat(tokenID).concat(CODE.substring(endIndex, CODE.length))

    if (definitions[type].multiple && CODE.match(find)) {
      input = extract(type, input)
    }

    return input
  }

  for (let type of Object.keys(definitions)) {
    code = (typeof definitions[type].extract !== 'undefined')
      ? extract(type, code)
      : tokenize(type, code)
  }

  const parsed = rebuild(code, name)

  if (typeof cb === 'function') cb(savedTokens, code, parsed);
  return parsed
}

module.exports = parse
