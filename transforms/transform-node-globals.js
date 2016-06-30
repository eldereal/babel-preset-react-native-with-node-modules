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

const UnbindBuffer = Symbol("UnbindBuffer");
const UnbindProcess = Symbol("UnbindProcess");

module.exports = function transformGlobalBuffer(babel) {
    const t = babel.types;

    return {
        visitor: {
            ReferencedIdentifier: function(path) {
                if (path.node.name === "Buffer" && path.node.type === "Identifier" && !path.scope.hasBinding('Buffer')) {
                    const program = findClosestProgram(path);
                    const rewriteTable = program.getData(UnbindBuffer) || [];
                    rewriteTable.push(path);
                    program.setData(UnbindBuffer, rewriteTable);
                }
                else if (path.node.name === "process" && path.node.type === "Identifier" && !path.scope.hasBinding('process')) {
                    const program = findClosestProgram(path);
                    const rewriteTable = program.getData(UnbindProcess) || [];
                    rewriteTable.push(path);
                    program.setData(UnbindProcess, rewriteTable);
                }
            },
            Program: {
                exit: function(program) {
                    const bufferTable = program.getData(UnbindBuffer);
                    if (bufferTable) {
                        let varname = "_Buffer_" + Math.random().toString(36).substr(-4);
                        while(true){
                            if(bufferTable.every(path => !path.scope.hasBinding(varname))){
                                break;
                            }
                        }
                        bufferTable.forEach(path => path.node.name = varname);
                        const setBufferVar = babel.transform("var _Buffer = typeof Buffer === 'undefined' ? ((typeof global !== 'undefined' && global && global.Buffer) ? global.Buffer : require('buffer/').Buffer) : Buffer").ast.program.body[0];
                        setBufferVar.declarations[0].id.name = varname;
                        program.node.body.splice(0, 0, setBufferVar);
                    }

                    const processTable = program.getData(UnbindProcess);
                    if (processTable) {
                        let varname = "_process_" + Math.random().toString(36).substr(-4);
                        while(true){
                            if(processTable.every(path => !path.scope.hasBinding(varname))){
                                break;
                            }
                        }
                        processTable.forEach(path => path.node.name = varname);
                        const setProcessVar = babel.transform("var _process = (function(){"+
                        "    var res = require('process/browser.js');"+
                        "    res.env = res.env || {};"+
                        "    if (!res.env.NODE_ENV) {"+
                        "      res.env.NODE_ENV = (typeof __DEV__ !== 'undefined' && __DEV__) ? 'development' : 'production';"+
                        "    }"+
                        "    console.info('process', res);"+
                        "    return res;"+
                        "})();").ast.program.body[0];
                        setProcessVar.declarations[0].id.name = varname;
                        program.node.body.splice(0, 0, setProcessVar);
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
