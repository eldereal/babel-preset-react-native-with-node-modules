'use strict';

/**
 * Transforms global Buffer to polyfill module 'buffer'.
 *
 * Example:
 *
 *   var buf = new Buffer();
 *
 * Transformed to:
 *
 *   var Buffer = require('Buffer');
 *   var buf = new Buffer();
 *
 */

const babel = require("babel-core");

const replacementBuffer = babel.transform("require('buffer/').Buffer").ast.program.body[0];
const replacementProcess = babel.transform("require('process/browser.js')").ast.program.body[0];

module.exports = function transformGlobalBuffer(babel) {
  const t = babel.types;

  return {
      visitor: {
          ReferencedIdentifier: function(path){
              if(path.node.name === "Buffer" && path.node.type === "Identifier" && !path.scope.hasBinding('Buffer')){
                  path.replaceWith(replacementBuffer);
              }else if(path.node.name === "process" && path.node.type === "Identifier" && !path.scope.hasBinding('process')){
                  path.replaceWith(replacementProcess);
              }
          },
      }
  };
};
