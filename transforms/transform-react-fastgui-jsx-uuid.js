"use strict";

module.exports = function(babel) {
    var t = babel.types;

    var visitor = { /*istanbul ignore next*/
        JSXOpeningElement: function JSXOpeningElement(path, state) {
            var id = t.jSXIdentifier(TRACE_ID);
            var location = path.container.openingElement.loc;
            if (!location) {
                // the element was generated and doesn't have location information
                return;
            }

            var attributes = path.container.openingElement.attributes;
            for (var i = 0; i < attributes.length; i++) {
                var name = attributes[i].name;
                if (name && name.name === TRACE_ID) {
                    // The __source attibute already exists
                    return;
                }
            }
            const uuid = Date.now().toString(36).substr(-4) + Math.random().toString(36).substr(-4);
            attributes.splice(0, 0, t.jSXAttribute(id, t.stringLiteral(uuid)));
        }
    };

    return {
        visitor: visitor
    };
};

var TRACE_ID = "__uuid";
