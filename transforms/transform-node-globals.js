'use strict';

/**
 * Transforms global Buffer and process to polyfill module 'buffer', 'process'.
 *
 * Example:
 *
 *   var buf = new Buffer();
 *
 * Transformed to:
 *
 *   var _Buffer_rand = typeof Buffer === 'undefined' ? ((typeof global !== 'undefined' && global && global.Buffer) ? global.Buffer : require('buffer/').Buffer) : Buffer;
 *   var buf = new _Buffer_rand();
 *
 */

const babel = require("babel-core");

const JSTimerNames = ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate', 'requestAnimationFrame', 'cancelAnimationFrame'];

const replaceConfig = {
    Buffer: "var _Buffer = typeof Buffer === 'undefined' ? require('buffer/').Buffer : Buffer",
    SlowBuffer: "var _SlowBuffer = typeof SlowBuffer === 'undefined' ? require('buffer/').SlowBuffer : SlowBuffer",
    process: "var _process = (function(){" +
        "    var res = typeof process === 'undefined' ? require('process/browser.js') : process;" +
        "    if (!res.title) {" +
        "        var polyfill = require('process/browser.js');" +
        "        for (var key in res) {" +
        "            polyfill[key] = res[key];" +
        "        }" +
        "        res = polyfill;" +
        "    }" +
        "    res.env = res.env || {};" +
        "    if (!res.env.NODE_ENV) {" +
        "      res.env.NODE_ENV = (typeof __DEV__ !== 'undefined' && __DEV__) ? 'development' : 'production';" +
        "    }" +
        "    return res;" +
        "})();"
};
JSTimerNames.forEach(name => replaceConfig[name] = 'var _timer = typeof ' + name + ' === "undefined" ? require("react-native/Libraries/JavaScriptAppEngine/System/JSTimers/JSTimers").' + name + ' : ' + name + ';');
const replaceSymbols = {};
for(const name in replaceConfig){
    replaceSymbols[name] = Symbol(name);
}

module.exports = function transformGlobalBuffer(babel) {
    const t = babel.types;

    return {
        visitor: {
            ReferencedIdentifier: function(path) {
                for (const name in replaceConfig) {
                    if (path.node.name === name && path.node.type === "Identifier" && !path.scope.hasBinding(name)) {
                        const program = findClosestProgram(path);
                        const rewriteTable = program.getData(replaceSymbols[name]) || [];
                        rewriteTable.push(path);
                        program.setData(replaceSymbols[name], rewriteTable);
                    }
                }
            },
            Program: {
                exit: function(program) {
                    for (const name in replaceConfig) {
                        const table = program.getData(replaceSymbols[name]);
                        if (table) {
                            let varname = "_" + name + "_" + Math.random().toString(36).substr(-4);
                            while (true) {
                                if (table.every(path => !path.scope.hasBinding(varname))) {
                                    break;
                                }
                            }
                            table.forEach(path => path.node.name = varname);
                            const setVar = babel.transform(replaceConfig[name]).ast.program.body[0];
                            setVar.declarations[0].id.name = varname;
                            program.node.body.splice(0, 0, setVar);
                        }
                    }
                }
            }
        }
    };

    function findClosestProgram(path) {
        while (path) {
            if (path.node.type === 'Program') {
                return path;
            }
            path = path.parentPath;
        }
    }
};
