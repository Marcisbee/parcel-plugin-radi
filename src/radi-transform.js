const { declare } = require("@babel/helper-plugin-utils");

module.exports = declare(({types: t}, options) => {

  const PRAGMA_DEFAULT = options.pragma || 'l';
  const LISTEN_ANNOTATION_REGEX = /\*?\s*@radi-listen\s+([^\s]+)/;

  let pragma = PRAGMA_DEFAULT;

  function listener() {
    const expr = t.identifier(pragma);
    expr.isClean = true;
    return expr;
  }

  let args = [];

  let variables = {
    prefix: '_$',
    count: 0,
  }

  const getvar = () => variables.prefix.concat(variables.count++);

  const makeListener = (variable, expression) => {
    let newVariable = variable.slice(1)
    if (variable[0].process) {
      return t.callExpression(
        t.memberExpression(
          t.callExpression(
            listener(),
            variable[0].props
          ),
          t.identifier('process')
        ),
        [
          t.functionExpression(
            null,
            [variable[0].var],
            t.blockStatement([
              t.returnStatement(
                newVariable.length > 0 ? makeListener(newVariable, expression) : expression
              )
            ])
          )
        ]
      )
    } else {
      return t.callExpression(
        listener(),
        variable[0].props
      )
    }
  }

  Array.prototype.extract = function (path) {
    if (t.isIdentifier(path.node.property)) {
      this.unshift(t.stringLiteral(path.node.property.name));
    } else {
      this.unshift(path.node.property);
    }
    if (t.isIdentifier(path.node.object)) {
      this.unshift(path.node.object);
    }
  }

  return {
    visitor: {
      Program(path) {
        for (const comment of path.container.comments) {
          const matches = LISTEN_ANNOTATION_REGEX.exec(comment.value);
          if (matches) {
            pragma = matches[1];
          }
        }
      },
      JSXExpressionContainer(path) {
        if (!path) return;
        // Handle object attribute like { style: { color: ... } }
        if (t.isObjectExpression(path.node.expression) && t.isJSXAttribute(path.parent)) {

          path.traverse({
            ObjectProperty(path) {
              // This isn't root member of Object
              if (!t.isObjectExpression(path.parent)) return;
              let gathered = [];
              path.traverse({
                MemberExpression(path) {
                  // This isn't root member of Object
                  if (t.isMemberExpression(path.parent)) return;

                  const isRoot = t.isJSXExpressionContainer(path.parent);

                  let extracted = [];

                  extracted.extract(path);
                  if (t.isMemberExpression(path.node.object)) {
                    path.traverse({
                      MemberExpression(path) {
                        extracted.extract(path);
                      },
                      ThisExpression(path) {
                        extracted.unshift(path.node);
                      },
                    });
                  }

                  // console.log('extracted', path.parentKey === callee);
                  let fn = (t.isCallExpression(path.parent) && path.parentKey === 'callee') && extracted.pop();

                  const DOLLAR = '$'.charCodeAt(0);

                  if (extracted[0]
                    && !t.isThisExpression(extracted[0])
                    && extracted[0].name !== 'component') return;
                  if (extracted[1] && extracted[1].value
                    && extracted[1].value.charCodeAt(0) === DOLLAR) {
                    extracted[0] = t.memberExpression(
                      extracted[0],
                      t.identifier(extracted[1].value),
                    );
                    extracted.splice(1, 1);
                  }
                  if (extracted[1] && extracted[1].name !== 'state') {
                    extracted.splice(1, 1);
                  }

                  if (extracted.length < 2) return;

                  // console.log('extracted', extracted);
                  // console.log('extracted', extracted.map(item => item.value || item.name));

                  // Should replace

                  let newvar = t.identifier(getvar());

                  if (t.isIdentifier(path.node.property)) {
                    path.node.property = t.stringLiteral(path.node.property.name);
                  }

                  gathered.push({
                    process: !(!fn && isRoot),
                    var: newvar,
                    props: extracted
                  })

                  path.replaceWith(t.expressionStatement(
                    fn ? t.memberExpression(newvar, t.identifier(fn.value)) : newvar,
                  ));
                }
              });

              if (gathered.length > 0) {
            	  path.replaceWith(
                  t.ObjectProperty(
                    path.node.key,
                    makeListener(gathered, path.node.value),
                  )
                );
              }
            }
          });

        } else {
          let gathered = [];

          path.traverse({
            JSXExpressionContainer(path) {
              path.skip();
            },
            MemberExpression(path) {
              // This isn't root member of Object
              if (t.isMemberExpression(path.parent)) return;

              const isRoot = t.isJSXExpressionContainer(path.parent);

              let extracted = [];

              extracted.extract(path);
              if (t.isMemberExpression(path.node.object)) {
                path.traverse({
                  MemberExpression(path) {
                    extracted.extract(path);
                  },
                  ThisExpression(path) {
                    extracted.unshift(path.node);
                  },
                });
              }

              // console.log('extracted', path.parentKey === callee);
              let fn = (t.isCallExpression(path.parent) && path.parentKey === 'callee') && extracted.pop();

              const DOLLAR = '$'.charCodeAt(0);

              if (extracted[0]
                && !t.isThisExpression(extracted[0])
                && extracted[0].name !== 'component') return;
              if (extracted[1] && extracted[1].value
                && extracted[1].value.charCodeAt(0) === DOLLAR) {
                extracted[0] = t.memberExpression(
                  extracted[0],
                  t.identifier(extracted[1].value),
                );
                extracted.splice(1, 1);
              }
              if (extracted[1] && extracted[1].name !== 'state') {
                extracted.splice(1, 1);
              }

              if (extracted.length < 2) return;

              // console.log('extracted', extracted);
              // console.log('extracted', extracted.map(item => item.value || item.name));

              // Should replace

              let newvar = t.identifier(getvar());

              if (t.isIdentifier(path.node.property)) {
                path.node.property = t.stringLiteral(path.node.property.name);
              }

              gathered.push({
                process: !(!fn && isRoot),
                var: newvar,
                props: extracted
              })

              path.replaceWith(t.expressionStatement(
                fn ? t.memberExpression(newvar, t.identifier(fn.value)) : newvar,
              ));
            }
          });

          if (gathered.length > 0) {
            if (t.isJSXAttribute(path.parent)) {
          	  path.replaceWith(
                t.JSXExpressionContainer(
                  makeListener(gathered, path.node.expression)
                )
              );
            } else {
          	  path.replaceWith(
                makeListener(gathered, path.node.expression)
              );
            }
          }

        }
      }
    }
  }

})
