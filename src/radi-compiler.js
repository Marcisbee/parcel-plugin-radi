const { declare } = require("@babel/helper-plugin-utils");

module.exports = declare(({types: t}, options) => {

  let name = 'Default';
  let html = null;

  const importRadi = () => (
  	t.importDeclaration(
      [t.importDefaultSpecifier(
      	t.identifier('Radi')
      )],
      t.stringLiteral('radi')
    )
  );

  const radiSpread = (keys) => (
    t.VariableDeclaration(
      'const',
      [t.VariableDeclarator(
        t.ObjectPattern(keys.map(
          key => {
            let key1 = typeof key === 'string' ? key : key[0];
            let key2 = typeof key === 'string' ? key : key[1];
            return t.objectProperty(
              t.identifier(key1),
              t.identifier(key2),
              false,
              key1 === key2
            )
          }
        )),
      	t.identifier('Radi')
      )]
    )
  );

  const getView = _ => (
    t.ClassMethod(
      'method',
      t.identifier('view'),
      [],
      t.blockStatement([
        t.variableDeclaration(
          'var',
          [
            t.variableDeclarator(
              t.identifier('component'),
              t.thisExpression()
            )
          ]
        ),
        t.returnStatement((html && html.node) || null)
      ])
    )
  );

  const addHTML = exportClass => {
    if (html) {
      exportClass.get('declaration.body')
        .pushContainer(
          'body',
          getView(html)
        );

      html.remove();
    }
  };

  return {
    visitor: {
      Program(path) {
        let hasclass = false;
        let programBody = path.get('body');

        if (programBody && programBody.length > 0) {
          programBody[0].insertBefore(importRadi());
          path.get('body')[0].insertAfter(radiSpread([
            ['_radi_listen', 'listen'],
          	'action',
            'l',
            'plugin',
            'subscribe',
            'worker',
          ]));
          //path
          //  .get('body')
          //  .unshiftContainer('body',
          //    importRadi()
          //  );
        }

        path.traverse({
          ExpressionStatement(expression) {
            expression.traverse({
              JSXElement(jsx) {
                if (expression.node.expression === jsx.node) {
                  html = jsx;
                }
              },
            });
          },
        });

        path.traverse({
          ExportDefaultDeclaration(exportClass) {
            hasclass = true;
            addHTML(exportClass);
          },
        });

        if (!hasclass) {
          path.get('body')[1].insertBefore(
          	t.ExportDefaultDeclaration(
              t.ClassDeclaration(
                t.Identifier(name),
                t.MemberExpression(
                  t.Identifier('Radi'),
                  t.Identifier('Component')
                ),
				        t.ClassBody([
                  getView()
                ]),
                []
              )
            )
          );
          if (html) html.remove();
        }
      },
    }
  }

})
