"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/test/runTest.ts
var import_node_test = require("node:test");
var import_node_assert = __toESM(require("node:assert"));

// src/languages/php/phpTokenizer.ts
var HTML_VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var PHPTokenizer = class {
  /**
   * Analyzuje PHP a HTML kód dokumentu a extrahuje strukturální informace:
   * třídy, metody, funkce, řídicí struktury, komentáře, prázdné řádky a úrovně zanoření.
   */
  static analyze(text) {
    const lines = text.split(/\r?\n/);
    const blankLineIndices = /* @__PURE__ */ new Set();
    for (let i2 = 0; i2 < lines.length; i2++) {
      if (lines[i2].trim().length === 0) {
        blankLineIndices.add(i2);
      }
    }
    const classes = [];
    const functions = [];
    const controls = [];
    const allBlocks = [];
    const comments = [];
    const completedScopes = [];
    let i = 0;
    let line = 0;
    let char = 0;
    const len = text.length;
    function nextChar() {
      const c = text[i];
      if (c === "\n") {
        line++;
        char = 0;
      } else {
        char++;
      }
      i++;
      return c;
    }
    function peek(offset = 0) {
      return i + offset < len ? text[i + offset] : "";
    }
    const blockStack = [];
    const scopeStack = [];
    let pendingDecl = null;
    let parenDepth = 0;
    let inPHP = false;
    let lastDocBlock = null;
    function pushScope(scope) {
      scopeStack.push(scope);
    }
    function popScope(scope, endLine) {
      completedScopes.push({ startLine: scope.startLine, endLine });
    }
    while (i < len) {
      const c = peek();
      if (!inPHP) {
        if (c === "<" && peek(1) === "?") {
          if (text.slice(i, i + 5).toLowerCase() === "<?php") {
            nextChar();
            nextChar();
            nextChar();
            nextChar();
            nextChar();
            inPHP = true;
            continue;
          }
          if (text.slice(i, i + 3) === "<?=") {
            nextChar();
            nextChar();
            nextChar();
            inPHP = true;
            continue;
          }
          if (text.slice(i, i + 5).toLowerCase() === "<?xml") {
            nextChar();
            nextChar();
            while (i < len && !(peek() === "?" && peek(1) === ">")) {
              nextChar();
            }
            if (i < len) {
              nextChar();
              nextChar();
            }
            continue;
          }
          nextChar();
          nextChar();
          inPHP = true;
          continue;
        }
        if (c === "<" && peek(1) === "!" && peek(2) === "-" && peek(3) === "-") {
          const commentStart = line;
          nextChar();
          nextChar();
          nextChar();
          nextChar();
          while (i < len && !(peek() === "-" && peek(1) === "-" && peek(2) === ">")) {
            nextChar();
          }
          if (i < len) {
            nextChar();
            nextChar();
            nextChar();
          }
          comments.push({ startLine: commentStart, endLine: line, isDocBlock: false });
          continue;
        }
        if (c === "<" && peek(1) === "!") {
          if (text.slice(i + 2, i + 9).toLowerCase() === "doctype") {
            while (i < len && peek() !== ">") {
              nextChar();
            }
            if (i < len) nextChar();
            continue;
          }
          if (text.slice(i + 2, i + 9) === "[cdata[") {
            while (i < len && !(peek() === "]" && peek(1) === "]" && peek(2) === ">")) {
              nextChar();
            }
            if (i < len) {
              nextChar();
              nextChar();
              nextChar();
            }
            continue;
          }
        }
        if (c === "<" && peek(1) === "/") {
          nextChar();
          nextChar();
          let tagName = "";
          while (i < len && /[a-zA-Z0-9_\-]/.test(peek())) {
            tagName += nextChar();
          }
          tagName = tagName.toLowerCase();
          while (i < len && peek() !== ">") {
            nextChar();
          }
          if (i < len) nextChar();
          let matchIdx = -1;
          for (let s = scopeStack.length - 1; s >= 0; s--) {
            if (scopeStack[s].type === "html" && scopeStack[s].tagName === tagName) {
              matchIdx = s;
              break;
            }
          }
          if (matchIdx !== -1) {
            while (scopeStack.length > matchIdx) {
              const popped = scopeStack.pop();
              popScope(popped, line);
            }
          }
          continue;
        }
        if (c === "<" && /[a-zA-Z]/.test(peek(1))) {
          nextChar();
          let tagName = "";
          while (i < len && /[a-zA-Z0-9_\-]/.test(peek())) {
            tagName += nextChar();
          }
          tagName = tagName.toLowerCase();
          let isSelfClosing = false;
          while (i < len) {
            if (peek() === "<" && peek(1) === "?") {
              nextChar();
              nextChar();
              while (i < len && !(peek() === "?" && peek(1) === ">")) {
                if (peek() === "'" || peek() === '"') {
                  const q = nextChar();
                  while (i < len && peek() !== q) {
                    if (peek() === "\\") nextChar();
                    nextChar();
                  }
                  if (i < len) nextChar();
                } else {
                  nextChar();
                }
              }
              if (i < len) {
                nextChar();
                nextChar();
              }
              continue;
            }
            if (peek() === '"' || peek() === "'") {
              const q = nextChar();
              while (i < len && peek() !== q) {
                if (peek() === "<" && peek(1) === "?") {
                  nextChar();
                  nextChar();
                  while (i < len && !(peek() === "?" && peek(1) === ">")) {
                    nextChar();
                  }
                  if (i < len) {
                    nextChar();
                    nextChar();
                  }
                  continue;
                }
                if (peek() === "\\") nextChar();
                nextChar();
              }
              if (i < len) nextChar();
              continue;
            }
            if (peek() === "/" && peek(1) === ">") {
              nextChar();
              nextChar();
              isSelfClosing = true;
              break;
            }
            if (peek() === ">") {
              nextChar();
              break;
            }
            nextChar();
          }
          if (!isSelfClosing && !HTML_VOID_ELEMENTS.has(tagName)) {
            pushScope({ type: "html", tagName, startLine: line });
          }
          continue;
        }
        nextChar();
        continue;
      }
      if (c === "?" && peek(1) === ">") {
        nextChar();
        nextChar();
        inPHP = false;
        continue;
      }
      if (c === "'" || c === '"') {
        const quote = c;
        nextChar();
        while (i < len) {
          const sc = peek();
          if (sc === "\\") {
            nextChar();
            if (i < len) nextChar();
            continue;
          }
          if (sc === quote) {
            nextChar();
            break;
          }
          nextChar();
        }
        continue;
      }
      if (c === "<" && peek(1) === "<" && peek(2) === "<") {
        nextChar();
        nextChar();
        nextChar();
        while (i < len && (peek() === " " || peek() === "	")) {
          nextChar();
        }
        let quoteChar = "";
        if (peek() === "'" || peek() === '"') {
          quoteChar = nextChar();
        }
        let id = "";
        while (i < len && /[A-Za-z0-9_]/.test(peek())) {
          id += nextChar();
        }
        if (quoteChar && peek() === quoteChar) {
          nextChar();
        }
        while (i < len) {
          if (peek() === "\n") {
            nextChar();
            let match = true;
            for (let k = 0; k < id.length; k++) {
              if (peek(k) !== id[k]) {
                match = false;
                break;
              }
            }
            if (match) {
              for (let k = 0; k < id.length; k++) {
                nextChar();
              }
              if (peek() === ";") {
                nextChar();
              }
              break;
            }
          } else {
            nextChar();
          }
        }
        continue;
      }
      if (c === "/" && peek(1) === "*") {
        const commentStartLine = line;
        const isDocBlock = peek(2) === "*" && peek(3) !== "/";
        nextChar();
        nextChar();
        while (i < len) {
          if (peek() === "*" && peek(1) === "/") {
            nextChar();
            nextChar();
            break;
          }
          nextChar();
        }
        const commentEndLine = line;
        comments.push({ startLine: commentStartLine, endLine: commentEndLine, isDocBlock });
        if (isDocBlock) {
          lastDocBlock = { startLine: commentStartLine, endLine: commentEndLine };
        }
        continue;
      }
      if (c === "/" && peek(1) === "/" || c === "#") {
        const commentStartLine = line;
        nextChar();
        if (c === "/") nextChar();
        while (i < len && peek() !== "\n") {
          nextChar();
        }
        comments.push({ startLine: commentStartLine, endLine: commentStartLine, isDocBlock: false });
        continue;
      }
      if (c === "(") {
        parenDepth++;
        nextChar();
        continue;
      }
      if (c === ")") {
        if (parenDepth > 0) parenDepth--;
        if (pendingDecl) {
          pendingDecl.endLine = line;
          pendingDecl.endChar = char;
        }
        nextChar();
        continue;
      }
      if (/[A-Za-z0-9_]/.test(c)) {
        const wordStartLine = line;
        const wordStartChar = char;
        let word = "";
        while (i < len && /[A-Za-z0-9_]/.test(peek())) {
          word += nextChar();
        }
        const lowerWord = word.toLowerCase();
        if (parenDepth === 0) {
          if (lowerWord === "class" || lowerWord === "interface" || lowerWord === "trait" || lowerWord === "enum") {
            let name = "";
            while (i < len && (peek() === " " || peek() === "	")) {
              nextChar();
            }
            while (i < len && /[A-Za-z0-9_]/.test(peek())) {
              name += nextChar();
            }
            pendingDecl = {
              type: lowerWord === "class" ? "class" : lowerWord === "interface" ? "interface" : "trait",
              name: name || void 0,
              startLine: wordStartLine,
              startChar: wordStartChar,
              endLine: line,
              endChar: char,
              headerText: lines[wordStartLine] || "",
              docBlockStartLine: lastDocBlock && wordStartLine - lastDocBlock.endLine <= 1 ? lastDocBlock.startLine : void 0,
              docBlockEndLine: lastDocBlock && wordStartLine - lastDocBlock.endLine <= 1 ? lastDocBlock.endLine : void 0
            };
            lastDocBlock = null;
          } else if (lowerWord === "function") {
            const parent = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;
            const isMethod = !!parent && (parent.type === "class" || parent.type === "trait" || parent.type === "interface");
            while (i < len && (peek() === " " || peek() === "	" || peek() === "&")) {
              nextChar();
            }
            let name = "";
            while (i < len && /[A-Za-z0-9_]/.test(peek())) {
              name += nextChar();
            }
            pendingDecl = {
              type: isMethod ? "method" : "function",
              name: name || void 0,
              startLine: wordStartLine,
              startChar: wordStartChar,
              endLine: line,
              endChar: char,
              headerText: lines[wordStartLine] || "",
              docBlockStartLine: lastDocBlock && wordStartLine - lastDocBlock.endLine <= 1 ? lastDocBlock.startLine : void 0,
              docBlockEndLine: lastDocBlock && wordStartLine - lastDocBlock.endLine <= 1 ? lastDocBlock.endLine : void 0,
              isMethod
            };
            lastDocBlock = null;
          } else if (["if", "elseif", "else", "while", "for", "foreach", "switch", "try", "catch", "finally", "do"].includes(lowerWord)) {
            pendingDecl = {
              type: "control",
              name: lowerWord,
              controlKeyword: lowerWord,
              startLine: wordStartLine,
              startChar: wordStartChar,
              endLine: line,
              endChar: char,
              headerText: lines[wordStartLine] || ""
            };
          } else if (["endif", "endforeach", "endfor", "endwhile", "endswitch"].includes(lowerWord)) {
            let matchIdx = -1;
            for (let s = scopeStack.length - 1; s >= 0; s--) {
              if (scopeStack[s].type === "php_alt") {
                matchIdx = s;
                break;
              }
            }
            if (matchIdx !== -1) {
              while (scopeStack.length > matchIdx) {
                const popped = scopeStack.pop();
                popScope(popped, line);
              }
            }
          } else if (pendingDecl) {
            pendingDecl.endLine = line;
            pendingDecl.endChar = char;
            pendingDecl.headerText = lines[line] || "";
          }
        } else if (pendingDecl) {
          pendingDecl.endLine = line;
          pendingDecl.endChar = char;
        }
        continue;
      }
      if (c === ":" && parenDepth === 0 && pendingDecl) {
        const kw = pendingDecl.controlKeyword || "";
        if (kw === "else" || kw === "elseif") {
          let matchIdx = -1;
          for (let s = scopeStack.length - 1; s >= 0; s--) {
            if (scopeStack[s].type === "php_alt") {
              matchIdx = s;
              break;
            }
          }
          if (matchIdx !== -1) {
            const popped = scopeStack.splice(matchIdx, 1)[0];
            popScope(popped, line);
          }
          pushScope({ type: "php_alt", startLine: line });
          pendingDecl = null;
          nextChar();
          continue;
        } else if (["if", "for", "foreach", "while", "switch"].includes(kw)) {
          pushScope({ type: "php_alt", startLine: line });
          pendingDecl = null;
          nextChar();
          continue;
        }
      }
      if (c === ";") {
        if (pendingDecl) {
          pendingDecl = null;
        }
        nextChar();
        continue;
      }
      if (c === "{") {
        const braceLine = line;
        const braceChar = char;
        nextChar();
        if (pendingDecl) {
          const decl = pendingDecl;
          pendingDecl = null;
          if (decl.type === "class" || decl.type === "interface" || decl.type === "trait") {
            const classObj = {
              type: decl.type,
              name: decl.name,
              declarationStartLine: decl.startLine,
              declarationEndLine: decl.endLine,
              headerText: decl.headerText,
              openBrace: { line: braceLine, char: braceChar },
              docBlockStartLine: decl.docBlockStartLine,
              docBlockEndLine: decl.docBlockEndLine,
              methods: []
            };
            classes.push(classObj);
            blockStack.push(classObj);
            allBlocks.push(classObj);
            pushScope({ type: "php_brace", startLine: braceLine, blockRef: classObj });
          } else if (decl.type === "method" || decl.type === "function") {
            const parent = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;
            const methodObj = {
              type: decl.type,
              name: decl.name,
              declarationStartLine: decl.startLine,
              declarationEndLine: decl.endLine,
              headerText: decl.headerText,
              openBrace: { line: braceLine, char: braceChar },
              docBlockStartLine: decl.docBlockStartLine,
              docBlockEndLine: decl.docBlockEndLine,
              isMethod: !!decl.isMethod,
              className: parent && parent.type === "class" ? parent.name : void 0
            };
            if (decl.isMethod && parent && (parent.type === "class" || parent.type === "trait" || parent.type === "interface")) {
              parent.methods.push(methodObj);
            } else {
              functions.push(methodObj);
            }
            blockStack.push(methodObj);
            allBlocks.push(methodObj);
            pushScope({ type: "php_brace", startLine: braceLine, blockRef: methodObj });
          } else if (decl.type === "control") {
            const controlObj = {
              type: "control",
              name: decl.controlKeyword,
              declarationStartLine: decl.startLine,
              declarationEndLine: decl.endLine,
              headerText: decl.headerText,
              openBrace: { line: braceLine, char: braceChar }
            };
            controls.push(controlObj);
            blockStack.push(controlObj);
            allBlocks.push(controlObj);
            pushScope({ type: "php_brace", startLine: braceLine, blockRef: controlObj });
          }
        } else {
          const anonBlock = {
            type: "control",
            declarationStartLine: braceLine,
            declarationEndLine: braceLine,
            headerText: "",
            openBrace: { line: braceLine, char: braceChar }
          };
          blockStack.push(anonBlock);
          allBlocks.push(anonBlock);
          pushScope({ type: "php_brace", startLine: braceLine, blockRef: anonBlock });
        }
        continue;
      }
      if (c === "}") {
        const closeLine = line;
        const closeChar = char;
        nextChar();
        if (blockStack.length > 0) {
          const popped = blockStack.pop();
          popped.closeBrace = { line: closeLine, char: closeChar };
          if (popped.openBrace && popped.openBrace.line === closeLine) {
            popped.isSingleLine = true;
          }
        }
        let matchIdx = -1;
        for (let s = scopeStack.length - 1; s >= 0; s--) {
          if (scopeStack[s].type === "php_brace") {
            matchIdx = s;
            break;
          }
        }
        if (matchIdx !== -1) {
          while (scopeStack.length > matchIdx) {
            const pScope = scopeStack.pop();
            popScope(pScope, closeLine);
          }
        }
        continue;
      }
      nextChar();
    }
    while (scopeStack.length > 0) {
      const pScope = scopeStack.pop();
      popScope(pScope, lines.length);
    }
    let baseIndent = 0;
    for (let l = 0; l < lines.length; l++) {
      const trimmed = lines[l].trim();
      if (trimmed.length > 0) {
        const leadingTabsMatch = /^\t+/.exec(lines[l]);
        if (leadingTabsMatch) {
          baseIndent = leadingTabsMatch[0].length;
        }
        break;
      }
    }
    const lineDepths = new Array(lines.length).fill(baseIndent);
    for (const sc of completedScopes) {
      for (let l = sc.startLine + 1; l < sc.endLine && l < lines.length; l++) {
        lineDepths[l]++;
      }
    }
    return {
      classes,
      functions,
      controls,
      comments,
      blankLineIndices,
      allBlocks,
      lineDepths
    };
  }
  /**
   * Vrací přesnou úroveň zanoření (počet tabulátorů) pro daný řádek souboru.
   */
  static getNestingDepth(line, analysis) {
    if (analysis?.lineDepths && line >= 0 && line < analysis.lineDepths.length) {
      return analysis.lineDepths[line];
    }
    if (!analysis || !analysis.allBlocks) return 0;
    let depth = 0;
    for (const block of analysis.allBlocks) {
      if (block.openBrace && block.openBrace.line < line) {
        if (!block.closeBrace || block.closeBrace.line > line) {
          depth++;
        }
      }
    }
    return depth;
  }
};

// src/rules/php/classBraceSameLine.ts
var ClassBraceSameLineRule = class {
  id = "nalemi.php.class-brace-same-line";
  name = "PHP Class Opening Brace on Same Line";
  languages = ["php"];
  run(context) {
    if (!context.settings.php.openingBraceSameLine) {
      return [];
    }
    const issues = [];
    const analysis = context.phpAnalysis;
    if (!analysis) return [];
    for (const cls of analysis.classes) {
      if (!cls.openBrace) continue;
      if (cls.openBrace.line > cls.declarationEndLine) {
        const braceLineIndex = cls.openBrace.line;
        const declLineIndex = cls.declarationEndLine;
        const declLineText = context.lines[declLineIndex] || "";
        issues.push({
          code: this.id,
          message: `Otev\xEDrac\xED slo\u017Een\xE1 z\xE1vorka '{' pro ${cls.type} '${cls.name || ""}' mus\xED b\xFDt na stejn\xE9m \u0159\xE1dku jako definice.`,
          severity: "warning",
          range: {
            startLine: braceLineIndex,
            startChar: cls.openBrace.char,
            endLine: braceLineIndex,
            endChar: cls.openBrace.char + 1
          },
          fix: {
            title: `P\u0159esunout otev\xEDrac\xED z\xE1vorku '{' na konec definice ${cls.type}`,
            edits: [
              // Add " {" at end of decl line
              {
                startLine: declLineIndex,
                startChar: declLineText.length,
                endLine: declLineIndex,
                endChar: declLineText.length,
                newText: " {"
              },
              // Remove the line with "{"
              {
                startLine: braceLineIndex,
                startChar: 0,
                endLine: braceLineIndex + 1,
                endChar: 0,
                newText: ""
              }
            ]
          }
        });
      }
    }
    return issues;
  }
};

// src/rules/php/methodBraceSameLine.ts
var MethodBraceSameLineRule = class {
  id = "nalemi.php.method-brace-same-line";
  name = "PHP Method/Function Opening Brace on Same Line";
  languages = ["php"];
  run(context) {
    if (!context.settings.php.openingBraceSameLine) {
      return [];
    }
    const issues = [];
    const analysis = context.phpAnalysis;
    if (!analysis) return [];
    const allMethods = [
      ...analysis.functions,
      ...analysis.classes.flatMap((c) => c.methods)
    ];
    for (const method of allMethods) {
      if (!method.openBrace) continue;
      if (method.openBrace.line > method.declarationEndLine) {
        const braceLineIndex = method.openBrace.line;
        const declLineIndex = method.declarationEndLine;
        const declLineText = context.lines[declLineIndex] || "";
        issues.push({
          code: this.id,
          message: `Otev\xEDrac\xED slo\u017Een\xE1 z\xE1vorka '{' pro ${method.isMethod ? "metodu" : "funkci"} '${method.name || ""}()' mus\xED b\xFDt na stejn\xE9m \u0159\xE1dku.`,
          severity: "warning",
          range: {
            startLine: braceLineIndex,
            startChar: method.openBrace.char,
            endLine: braceLineIndex,
            endChar: method.openBrace.char + 1
          },
          fix: {
            title: `P\u0159esunout otev\xEDrac\xED z\xE1vorku '{' na konec deklarace ${method.isMethod ? "metody" : "funkce"}`,
            edits: [
              {
                startLine: declLineIndex,
                startChar: declLineText.length,
                endLine: declLineIndex,
                endChar: declLineText.length,
                newText: " {"
              },
              {
                startLine: braceLineIndex,
                startChar: 0,
                endLine: braceLineIndex + 1,
                endChar: 0,
                newText: ""
              }
            ]
          }
        });
      }
    }
    return issues;
  }
};

// src/rules/php/controlBraceSameLine.ts
var ControlBraceSameLineRule = class {
  id = "nalemi.php.control-brace-same-line";
  name = "PHP Control Structure Opening Brace on Same Line";
  languages = ["php"];
  run(context) {
    if (!context.settings.php.controlStructureBraceSameLine) {
      return [];
    }
    const issues = [];
    const analysis = context.phpAnalysis;
    if (!analysis) return [];
    for (const ctrl of analysis.controls) {
      if (!ctrl.openBrace) continue;
      if (ctrl.openBrace.line > ctrl.declarationEndLine) {
        const braceLineIndex = ctrl.openBrace.line;
        const declLineIndex = ctrl.declarationEndLine;
        const declLineText = context.lines[declLineIndex] || "";
        issues.push({
          code: this.id,
          message: `Otev\xEDrac\xED slo\u017Een\xE1 z\xE1vorka '{' pro \u0159\xEDdic\xED strukturu '${ctrl.name || "podm\xEDnku"}' mus\xED b\xFDt na stejn\xE9m \u0159\xE1dku.`,
          severity: "warning",
          range: {
            startLine: braceLineIndex,
            startChar: ctrl.openBrace.char,
            endLine: braceLineIndex,
            endChar: ctrl.openBrace.char + 1
          },
          fix: {
            title: `P\u0159esunout otev\xEDrac\xED z\xE1vorku '{' na konec \u0159\xE1dku s ${ctrl.name || "podm\xEDnkou"}`,
            edits: [
              {
                startLine: declLineIndex,
                startChar: declLineText.length,
                endLine: declLineIndex,
                endChar: declLineText.length,
                newText: " {"
              },
              {
                startLine: braceLineIndex,
                startChar: 0,
                endLine: braceLineIndex + 1,
                endChar: 0,
                newText: ""
              }
            ]
          }
        });
      }
    }
    return issues;
  }
};

// src/rules/php/blankLineAfterBrace.ts
var BlankLineAfterBraceRule = class {
  id = "nalemi.php.blank-line-after-brace";
  name = "PHP Blank Line After Class and Method Opening Brace";
  languages = ["php"];
  run(context) {
    const issues = [];
    const analysis = context.phpAnalysis;
    if (!analysis) return [];
    const lines = context.lines;
    const countBlankLines = (startLine) => {
      let count = 0;
      let idx = startLine;
      while (idx < lines.length && lines[idx].trim().length === 0) {
        count++;
        idx++;
      }
      return count;
    };
    const expectedClassBlanks = context.settings.php.blankLineAfterClassBrace;
    for (const cls of analysis.classes) {
      if (!cls.openBrace || cls.isSingleLine) continue;
      if (cls.closeBrace && cls.closeBrace.line === cls.openBrace.line + 1) {
        continue;
      }
      const startCheckLine = cls.openBrace.line + 1;
      const actualBlanks = countBlankLines(startCheckLine);
      if (actualBlanks !== expectedClassBlanks) {
        const diff = expectedClassBlanks - actualBlanks;
        issues.push({
          code: `${this.id}.class`,
          message: actualBlanks < expectedClassBlanks ? `Ihned pod deklarac\xED t\u0159\xEDdy '${cls.name || ""}' (za '{') mus\xED b\xFDt ${expectedClassBlanks} pr\xE1zdn\xFD \u0159\xE1dek (nalezeno ${actualBlanks}).` : `P\u0159\xEDli\u0161 mnoho pr\xE1zdn\xFDch \u0159\xE1dk\u016F za otev\xEDrac\xED z\xE1vorkou t\u0159\xEDdy '${cls.name || ""}' (nalezeno ${actualBlanks}, o\u010Dek\xE1v\xE1no ${expectedClassBlanks}).`,
          severity: "warning",
          range: {
            startLine: cls.openBrace.line,
            startChar: cls.openBrace.char,
            endLine: cls.openBrace.line,
            endChar: cls.openBrace.char + 1
          },
          fix: {
            title: actualBlanks < expectedClassBlanks ? `Vlo\u017Eit ${diff} pr\xE1zdn\xFD \u0159\xE1dek za '{'` : `Upravit na ${expectedClassBlanks} pr\xE1zdn\xFD \u0159\xE1dek`,
            edits: actualBlanks < expectedClassBlanks ? [
              {
                startLine: cls.openBrace.line + 1,
                startChar: 0,
                endLine: cls.openBrace.line + 1,
                endChar: 0,
                newText: context.settings.common.emptyLineIndentation === "tabs" ? ("	".repeat(PHPTokenizer.getNestingDepth(cls.openBrace.line + 1, context.phpAnalysis)) + "\n").repeat(diff) : "\n".repeat(diff)
              }
            ] : [
              {
                startLine: cls.openBrace.line + 1 + expectedClassBlanks,
                startChar: 0,
                endLine: cls.openBrace.line + 1 + actualBlanks,
                endChar: 0,
                newText: ""
              }
            ]
          }
        });
      }
    }
    const expectedMethodBlanks = context.settings.php.blankLineAfterMethodBrace;
    const allMethods = [
      ...analysis.functions,
      ...analysis.classes.flatMap((c) => c.methods)
    ];
    for (const method of allMethods) {
      if (!method.openBrace || method.isSingleLine) continue;
      if (method.closeBrace && method.closeBrace.line === method.openBrace.line + 1) {
        continue;
      }
      const startCheckLine = method.openBrace.line + 1;
      const actualBlanks = countBlankLines(startCheckLine);
      const bodyEndLine = (method.closeBrace ? method.closeBrace.line : lines.length) - 1;
      let codeLineCount = 0;
      for (let l = startCheckLine; l <= bodyEndLine; l++) {
        const trimmed = lines[l].trim();
        if (trimmed.length === 0) continue;
        if (trimmed.startsWith("//") || trimmed.startsWith("#")) continue;
        if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.endsWith("*/")) continue;
        codeLineCount++;
      }
      if (codeLineCount <= 1) {
        if (actualBlanks > 1) {
          issues.push({
            code: `${this.id}.method`,
            message: `P\u0159\xEDli\u0161 mnoho pr\xE1zdn\xFDch \u0159\xE1dk\u016F za otev\xEDrac\xED z\xE1vorkou ${method.isMethod ? "metody" : "funkce"} '${method.name || ""}()' (nalezeno ${actualBlanks}, povolen maxim\xE1ln\u011B 1).`,
            severity: "warning",
            range: {
              startLine: method.openBrace.line,
              startChar: method.openBrace.char,
              endLine: method.openBrace.line,
              endChar: method.openBrace.char + 1
            },
            fix: {
              title: "Upravit na 1 pr\xE1zdn\xFD \u0159\xE1dek",
              edits: [
                {
                  startLine: method.openBrace.line + 2,
                  startChar: 0,
                  endLine: method.openBrace.line + 1 + actualBlanks,
                  endChar: 0,
                  newText: ""
                }
              ]
            }
          });
        }
        continue;
      }
      if (actualBlanks !== expectedMethodBlanks) {
        const diff = expectedMethodBlanks - actualBlanks;
        issues.push({
          code: `${this.id}.method`,
          message: actualBlanks < expectedMethodBlanks ? `Ihned pod otev\xEDrac\xED z\xE1vorkou ${method.isMethod ? "metody" : "funkce"} '${method.name || ""}()' mus\xED b\xFDt ${expectedMethodBlanks} pr\xE1zdn\xFD \u0159\xE1dek (nalezeno ${actualBlanks}).` : `P\u0159\xEDli\u0161 mnoho pr\xE1zdn\xFDch \u0159\xE1dk\u016F za otev\xEDrac\xED z\xE1vorkou ${method.isMethod ? "metody" : "funkce"} '${method.name || ""}()' (nalezeno ${actualBlanks}, o\u010Dek\xE1v\xE1no ${expectedMethodBlanks}).`,
          severity: "warning",
          range: {
            startLine: method.openBrace.line,
            startChar: method.openBrace.char,
            endLine: method.openBrace.line,
            endChar: method.openBrace.char + 1
          },
          fix: {
            title: actualBlanks < expectedMethodBlanks ? `Vlo\u017Eit ${diff} pr\xE1zdn\xFD \u0159\xE1dek za '{'` : `Upravit na ${expectedMethodBlanks} pr\xE1zdn\xFD \u0159\xE1dek`,
            edits: actualBlanks < expectedMethodBlanks ? [
              {
                startLine: method.openBrace.line + 1,
                startChar: 0,
                endLine: method.openBrace.line + 1,
                endChar: 0,
                newText: context.settings.common.emptyLineIndentation === "tabs" ? ("	".repeat(PHPTokenizer.getNestingDepth(method.openBrace.line + 1, context.phpAnalysis)) + "\n").repeat(diff) : "\n".repeat(diff)
              }
            ] : [
              {
                startLine: method.openBrace.line + 1 + expectedMethodBlanks,
                startChar: 0,
                endLine: method.openBrace.line + 1 + actualBlanks,
                endChar: 0,
                newText: ""
              }
            ]
          }
        });
      }
    }
    return issues;
  }
};

// src/rules/php/blankLinesBetweenMethods.ts
var BlankLinesBetweenMethodsRule = class {
  id = "nalemi.php.blank-lines-between-methods";
  name = "PHP Two Blank Lines Between Methods";
  languages = ["php"];
  run(context) {
    const issues = [];
    const analysis = context.phpAnalysis;
    if (!analysis) return [];
    const expectedBlanks = context.settings.php.blankLinesBetweenMethods;
    const lines = context.lines;
    for (const cls of analysis.classes) {
      const methods = cls.methods.filter((m) => m.openBrace && m.closeBrace);
      if (methods.length < 2) continue;
      methods.sort((a, b) => a.declarationStartLine - b.declarationStartLine);
      for (let i = 0; i < methods.length - 1; i++) {
        const current = methods[i];
        const next = methods[i + 1];
        if (!current.closeBrace) continue;
        const currentEndLine = current.closeBrace.line;
        const nextStartLine = next.docBlockStartLine !== void 0 ? next.docBlockStartLine : next.declarationStartLine;
        if (nextStartLine <= currentEndLine) {
          continue;
        }
        let blankCount = 0;
        let allBlank = true;
        for (let lineIdx = currentEndLine + 1; lineIdx < nextStartLine; lineIdx++) {
          if (lines[lineIdx].trim().length === 0) {
            blankCount++;
          } else {
            allBlank = false;
          }
        }
        const actualBlanks = allBlank ? nextStartLine - currentEndLine - 1 : blankCount;
        if (actualBlanks !== expectedBlanks) {
          const diff = expectedBlanks - actualBlanks;
          issues.push({
            code: this.id,
            message: `Mezi metodami '${current.name || ""}()' a '${next.name || ""}()' mus\xED b\xFDt pr\xE1v\u011B ${expectedBlanks} pr\xE1zdn\xE9 \u0159\xE1dky (nalezeno: ${actualBlanks}).`,
            severity: "warning",
            range: {
              startLine: currentEndLine + 1 < nextStartLine ? currentEndLine + 1 : nextStartLine,
              startChar: 0,
              endLine: nextStartLine,
              endChar: (lines[nextStartLine] || "").length
            },
            fix: {
              title: actualBlanks < expectedBlanks ? `Doplnit ${diff} pr\xE1zdn\xFD \u0159\xE1dek mezi metodami` : `Upravit mezeru mezi metodami na ${expectedBlanks} pr\xE1zdn\xE9 \u0159\xE1dky`,
              edits: [
                {
                  startLine: currentEndLine + 1,
                  startChar: 0,
                  endLine: nextStartLine,
                  endChar: 0,
                  newText: context.settings.common.emptyLineIndentation === "tabs" ? "	\n".repeat(expectedBlanks) : "\n".repeat(expectedBlanks)
                }
              ]
            }
          });
        }
      }
    }
    return issues;
  }
};

// src/rules/common/indentationAndWhitespace.ts
var IndentationAndWhitespaceRule = class {
  id = "nalemi.common.whitespace";
  name = "Indentation and Whitespace Formatting";
  languages = ["php", "javascript", "typescript", "html", "css"];
  run(context) {
    const issues = [];
    const lines = context.lines;
    const settings = context.settings.common;
    const commentLines = /* @__PURE__ */ new Set();
    if (context.phpAnalysis) {
      for (const c of context.phpAnalysis.comments) {
        for (let l = c.startLine; l <= c.endLine; l++) {
          commentLines.add(l);
        }
      }
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length === 0) {
        const expectedTabs = PHPTokenizer.getNestingDepth(i, context.phpAnalysis);
        const hasSpaces = line.includes(" ");
        const actualTabs = (line.match(/^\t*/)?.[0] || "").length;
        if (hasSpaces) {
          issues.push({
            code: "nalemi.common.empty-line-spaces",
            message: "Pr\xE1zdn\xFD \u0159\xE1dek nesm\xED obsahovat mezery, pouze tabul\xE1tory pro zachov\xE1n\xED \xFArovn\u011B.",
            severity: "warning",
            range: {
              startLine: i,
              startChar: 0,
              endLine: i,
              endChar: line.length
            },
            fix: {
              title: `Nahradit mezery za ${expectedTabs} tabul\xE1tor${expectedTabs === 1 ? "" : expectedTabs < 5 ? "y" : "\u016F"}`,
              edits: [
                {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: line.length,
                  newText: "	".repeat(expectedTabs)
                }
              ]
            }
          });
        } else if (settings.emptyLineIndentation !== "off") {
          if (settings.emptyLineIndentation === "tabs") {
            if (actualTabs !== expectedTabs) {
              issues.push({
                code: "nalemi.common.empty-line-indent",
                message: `Pr\xE1zdn\xFD \u0159\xE1dek by m\u011Bl obsahovat ${expectedTabs} ${expectedTabs === 1 ? "tabul\xE1tor" : expectedTabs < 5 ? "tabul\xE1tory" : "tabul\xE1tor\u016F"} pro zachov\xE1n\xED \xFArovn\u011B odsazen\xED (nalezeno ${actualTabs}).`,
                severity: "warning",
                range: {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: line.length
                },
                fix: {
                  title: `Upravit odsazen\xED pr\xE1zdn\xE9ho \u0159\xE1dku na ${expectedTabs} tabul\xE1tor${expectedTabs === 1 ? "" : expectedTabs < 5 ? "y" : "\u016F"}`,
                  edits: [
                    {
                      startLine: i,
                      startChar: 0,
                      endLine: i,
                      endChar: line.length,
                      newText: "	".repeat(expectedTabs)
                    }
                  ]
                }
              });
            }
          } else if (settings.emptyLineIndentation === "allow-empty-or-tabs") {
            if (actualTabs !== 0 && actualTabs !== expectedTabs) {
              issues.push({
                code: "nalemi.common.empty-line-indent",
                message: `Pr\xE1zdn\xFD \u0159\xE1dek m\xE1 nespr\xE1vn\xFD po\u010Det tabul\xE1tor\u016F (nalezeno ${actualTabs}, o\u010Dek\xE1v\xE1no 0 nebo ${expectedTabs}).`,
                severity: "warning",
                range: {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: line.length
                },
                fix: {
                  title: `Upravit odsazen\xED pr\xE1zdn\xE9ho \u0159\xE1dku na ${expectedTabs} tabul\xE1tor${expectedTabs === 1 ? "" : expectedTabs < 5 ? "y" : "\u016F"}`,
                  edits: [
                    {
                      startLine: i,
                      startChar: 0,
                      endLine: i,
                      endChar: line.length,
                      newText: "	".repeat(expectedTabs)
                    }
                  ]
                }
              });
            }
          } else if (settings.emptyLineIndentation === "empty") {
            if (actualTabs > 0) {
              issues.push({
                code: "nalemi.common.empty-line-indent",
                message: "Pr\xE1zdn\xFD \u0159\xE1dek nesm\xED obsahovat tabul\xE1tory.",
                severity: "warning",
                range: {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: line.length
                },
                fix: {
                  title: "Odstranit tabul\xE1tory z pr\xE1zdn\xE9ho \u0159\xE1dku",
                  edits: [
                    {
                      startLine: i,
                      startChar: 0,
                      endLine: i,
                      endChar: line.length,
                      newText: ""
                    }
                  ]
                }
              });
            }
          }
        }
        continue;
      }
      if (settings.noTrailingWhitespace) {
        const match = /[ \t]+$/.exec(line);
        if (match) {
          const startIndex = match.index;
          issues.push({
            code: "nalemi.common.trailing-whitespace",
            message: "\u0158\xE1dek obsahuje zbyte\u010Dn\xE9 pr\xE1zdn\xE9 znaky na konci (trailing whitespace).",
            severity: "warning",
            range: {
              startLine: i,
              startChar: startIndex,
              endLine: i,
              endChar: line.length
            },
            fix: {
              title: "Odstranit pr\xE1zdn\xE9 znaky na konci \u0159\xE1dku",
              edits: [
                {
                  startLine: i,
                  startChar: startIndex,
                  endLine: i,
                  endChar: line.length,
                  newText: ""
                }
              ]
            }
          });
        }
      }
      if (settings.indentType !== "off" && line.trim().length > 0) {
        const leadingWhitespaceMatch = /^[ \t]+/.exec(line);
        if (leadingWhitespaceMatch) {
          const leadingWhitespace = leadingWhitespaceMatch[0];
          const isCommentLine = commentLines.has(i);
          if (settings.indentType === "tabs") {
            if (isCommentLine && /^\t*\s*\*/.test(line)) {
            } else if (/^ +/.test(leadingWhitespace)) {
              const expectedTabs = PHPTokenizer.getNestingDepth(i, context.phpAnalysis);
              const tabCount = expectedTabs > 0 ? expectedTabs : Math.max(1, Math.round(leadingWhitespace.length / 4));
              issues.push({
                code: "nalemi.common.indent-tabs",
                message: "Odsazen\xED mus\xED b\xFDt prov\xE1d\u011Bno tabul\xE1tory (\\t), nikoliv mezerami.",
                severity: "warning",
                range: {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: leadingWhitespace.length
                },
                fix: {
                  title: `Nahradit mezery za ${tabCount} tabul\xE1tor${tabCount === 1 ? "" : tabCount < 5 ? "y" : "\u016F"}`,
                  edits: [
                    {
                      startLine: i,
                      startChar: 0,
                      endLine: i,
                      endChar: leadingWhitespace.length,
                      newText: "	".repeat(tabCount)
                    }
                  ]
                }
              });
            }
          } else if (settings.indentType === "spaces") {
            if (leadingWhitespace.includes("	")) {
              issues.push({
                code: "nalemi.common.indent-spaces",
                message: "Odsazen\xED mus\xED b\xFDt prov\xE1d\u011Bno mezerami, nikoliv tabul\xE1tory.",
                severity: "warning",
                range: {
                  startLine: i,
                  startChar: 0,
                  endLine: i,
                  endChar: leadingWhitespace.length
                }
              });
            }
          }
        }
      }
      if (settings.spaceBeforeOpeningBrace) {
        const noSpaceBraceMatch = /([^\s\t])\{/.exec(line);
        if (noSpaceBraceMatch && !commentLines.has(i)) {
          const charPos = noSpaceBraceMatch.index + 1;
          if (noSpaceBraceMatch[1] !== "$" && noSpaceBraceMatch[1] !== '"' && noSpaceBraceMatch[1] !== "'") {
            issues.push({
              code: "nalemi.common.space-before-brace",
              message: "P\u0159ed otev\xEDrac\xED slo\u017Eenou z\xE1vorkou '{' chyb\xED mezera.",
              severity: "warning",
              range: {
                startLine: i,
                startChar: charPos,
                endLine: i,
                endChar: charPos + 1
              },
              fix: {
                title: "Vlo\u017Eit mezeru p\u0159ed '{'",
                edits: [
                  {
                    startLine: i,
                    startChar: charPos,
                    endLine: i,
                    endChar: charPos,
                    newText: " "
                  }
                ]
              }
            });
          }
        }
        const multiSpaceBraceMatch = /([^\s\t])( {2,})\{/.exec(line);
        if (multiSpaceBraceMatch && !commentLines.has(i)) {
          const startSpacePos = multiSpaceBraceMatch.index + 1;
          const spaceLength = multiSpaceBraceMatch[2].length;
          issues.push({
            code: "nalemi.common.single-space-before-brace",
            message: "P\u0159ed otev\xEDrac\xED slo\u017Eenou z\xE1vorkou '{' m\xE1 b\xFDt pr\xE1v\u011B jedna mezera.",
            severity: "warning",
            range: {
              startLine: i,
              startChar: startSpacePos,
              endLine: i,
              endChar: startSpacePos + spaceLength
            },
            fix: {
              title: "Nahradit za jedinou mezeru",
              edits: [
                {
                  startLine: i,
                  startChar: startSpacePos,
                  endLine: i,
                  endChar: startSpacePos + spaceLength,
                  newText: " "
                }
              ]
            }
          });
        }
      }
    }
    return issues;
  }
};

// src/languages/php/phpProvider.ts
var PHPLanguageProvider = class {
  static languageId = "php";
  static getRules() {
    return [
      new ClassBraceSameLineRule(),
      new MethodBraceSameLineRule(),
      new ControlBraceSameLineRule(),
      new BlankLineAfterBraceRule(),
      new BlankLinesBetweenMethodsRule(),
      new IndentationAndWhitespaceRule()
    ];
  }
  static analyze(text) {
    return PHPTokenizer.analyze(text);
  }
};

// src/core/ruleEngine.ts
var RuleEngine = class {
  rules = /* @__PURE__ */ new Map();
  constructor() {
    this.registerLanguageRules(
      PHPLanguageProvider.languageId,
      PHPLanguageProvider.getRules()
    );
  }
  registerLanguageRules(languageId, rules) {
    const existing = this.rules.get(languageId) || [];
    this.rules.set(languageId, [...existing, ...rules]);
  }
  validate(documentText, languageId, settings) {
    if (!settings.enable) {
      return [];
    }
    const rules = this.rules.get(languageId);
    if (!rules || rules.length === 0) {
      return [];
    }
    const lines = documentText.split(/\r?\n/);
    const context = {
      documentText,
      lines,
      lineCount: lines.length,
      settings,
      languageId
    };
    if (languageId === "php") {
      context.phpAnalysis = PHPLanguageProvider.analyze(documentText);
    }
    const allIssues = [];
    for (const rule of rules) {
      try {
        const issues = rule.run(context);
        allIssues.push(...issues);
      } catch (err) {
        console.error(`Chyba p\u0159i b\u011Bhu pravidla ${rule.id}:`, err);
      }
    }
    return allIssues;
  }
};

// src/core/config.ts
var vscodeModule = null;
try {
  vscodeModule = require("vscode");
} catch {
  vscodeModule = null;
}
var DEFAULT_SETTINGS = {
  enable: true,
  validateOn: "type",
  php: {
    openingBraceSameLine: true,
    controlStructureBraceSameLine: true,
    blankLineAfterClassBrace: 1,
    blankLineAfterMethodBrace: 1,
    blankLinesBetweenMethods: 2
  },
  common: {
    indentType: "tabs",
    noTrailingWhitespace: true,
    spaceBeforeOpeningBrace: true,
    emptyLineIndentation: "tabs"
  }
};

// src/test/runTest.ts
(0, import_node_test.describe)("Nalemi Valid Formatter Rules Test Suite", () => {
  const engine = new RuleEngine();
  const testSettings = {
    ...DEFAULT_SETTINGS,
    enable: true
  };
  (0, import_node_test.it)("Rule: Class brace on same line vs next line", () => {
    const badCode = `<?php
class BadClass
{

	public function test() {

	}
}
`;
    const issuesBad = engine.validate(badCode, "php", testSettings);
    const braceIssues = issuesBad.filter((i) => i.code === "nalemi.php.class-brace-same-line");
    import_node_assert.default.strictEqual(braceIssues.length, 1);
    import_node_assert.default.ok(braceIssues[0].message.includes("BadClass"));
    const goodCode = `<?php
class GoodClass {

	public function test() {

	}
}
`;
    const issuesGood = engine.validate(goodCode, "php", testSettings);
    const braceIssuesGood = issuesGood.filter((i) => i.code === "nalemi.php.class-brace-same-line");
    import_node_assert.default.strictEqual(braceIssuesGood.length, 0);
  });
  (0, import_node_test.it)("Rule: Method brace on same line vs next line", () => {
    const badCode = `<?php
class MyClass {

	public function badMethod()
	{

		return true;
	}
}
`;
    const issuesBad = engine.validate(badCode, "php", testSettings);
    const methodBraceIssues = issuesBad.filter((i) => i.code === "nalemi.php.method-brace-same-line");
    import_node_assert.default.strictEqual(methodBraceIssues.length, 1);
    import_node_assert.default.ok(methodBraceIssues[0].message.includes("badMethod"));
    const goodCode = `<?php
class MyClass {

	public function goodMethod() {

		return true;
	}
}
`;
    const issuesGood = engine.validate(goodCode, "php", testSettings);
    const methodBraceIssuesGood = issuesGood.filter((i) => i.code === "nalemi.php.method-brace-same-line");
    import_node_assert.default.strictEqual(methodBraceIssuesGood.length, 0);
  });
  (0, import_node_test.it)("Rule: Control structure (if) opening brace on same line", () => {
    const badCode = `<?php
class TestClass {

	public function check($x) {

		if ($x > 0)
		{
			return 1;
		}
	}
}
`;
    const issues = engine.validate(badCode, "php", testSettings);
    const controlIssues = issues.filter((i) => i.code === "nalemi.php.control-brace-same-line");
    import_node_assert.default.strictEqual(controlIssues.length, 1);
    import_node_assert.default.ok(controlIssues[0].message.includes("if"));
  });
  (0, import_node_test.it)("Rule: Blank line after class and method opening brace", () => {
    const noBlankCode = `<?php
class NoBlankClass {
	public function multiLineMethod() {
		$a = 1;
		$b = 2;
	}
}
`;
    const issuesBad = engine.validate(noBlankCode, "php", testSettings);
    const classBlankIssues = issuesBad.filter((i) => i.code === "nalemi.php.blank-line-after-brace.class");
    const methodBlankIssues = issuesBad.filter((i) => i.code === "nalemi.php.blank-line-after-brace.method");
    import_node_assert.default.strictEqual(classBlankIssues.length, 1);
    import_node_assert.default.strictEqual(methodBlankIssues.length, 1);
    const singleLineNoBlank = `<?php
class ValidSingleLineClass {

	public function make(string $class): mixed {
		return $this->resolve($class);
	}
}
`;
    const issuesSingleNoBlank = engine.validate(singleLineNoBlank, "php", testSettings);
    const singleMethodIssues = issuesSingleNoBlank.filter((i) => i.code === "nalemi.php.blank-line-after-brace.method");
    import_node_assert.default.strictEqual(singleMethodIssues.length, 0, "Single-line method should not require a blank line");
    const singleLineWithBlank = `<?php
class ValidSingleLineClass {

	public function make(string $class): mixed {

		return $this->resolve($class);
	}
}
`;
    const issuesSingleWithBlank = engine.validate(singleLineWithBlank, "php", testSettings);
    const singleMethodWithBlankIssues = issuesSingleWithBlank.filter((i) => i.code === "nalemi.php.blank-line-after-brace.method");
    import_node_assert.default.strictEqual(singleMethodWithBlankIssues.length, 0, "Single-line method with 1 blank line should also be valid");
    const singleLineTooManyBlanks = `<?php
class ValidSingleLineClass {

	public function make(string $class): mixed {



		return $this->resolve($class);
	}
}
`;
    const issuesTooMany = engine.validate(singleLineTooManyBlanks, "php", testSettings);
    const tooManyIssues = issuesTooMany.filter((i) => i.code === "nalemi.php.blank-line-after-brace.method");
    import_node_assert.default.strictEqual(tooManyIssues.length, 1, "Should report too many blank lines (>1)");
  });
  (0, import_node_test.it)("Rule: Two blank lines between methods", () => {
    const oneBlankBetween = `<?php
class CalcHelper {

	public function methodOne() {

		return 1;
	}

	public function methodTwo() {

		return 2;
	}
}
`;
    const issuesOne = engine.validate(oneBlankBetween, "php", testSettings);
    const methodGapIssuesOne = issuesOne.filter((i) => i.code === "nalemi.php.blank-lines-between-methods");
    import_node_assert.default.strictEqual(methodGapIssuesOne.length, 1);
    import_node_assert.default.ok(methodGapIssuesOne[0].message.includes("pr\xE1v\u011B 2 pr\xE1zdn\xE9 \u0159\xE1dky"));
    const zeroBlankBetween = `<?php
class CalcHelper {

	public function methodOne() {

		return 1;
	}
	public function methodTwo() {

		return 2;
	}
}
`;
    const issuesZero = engine.validate(zeroBlankBetween, "php", testSettings);
    const methodGapIssuesZero = issuesZero.filter((i) => i.code === "nalemi.php.blank-lines-between-methods");
    import_node_assert.default.strictEqual(methodGapIssuesZero.length, 1);
    const twoBlanksBetween = `<?php
class CalcHelper {

	public function methodOne() {

		return 1;
	}


	public function methodTwo() {

		return 2;
	}
}
`;
    const issuesTwo = engine.validate(twoBlanksBetween, "php", testSettings);
    const methodGapIssuesTwo = issuesTwo.filter((i) => i.code === "nalemi.php.blank-lines-between-methods");
    import_node_assert.default.strictEqual(methodGapIssuesTwo.length, 0);
  });
  (0, import_node_test.it)("Rule: Two blank lines between methods with DocBlock", () => {
    const codeWithDocBlock = `<?php
class Helper {

	public function firstMethod() {

		return 1;
	}


	/**
	 * Popis metody
	 */
	public function secondMethod() {

		return 2;
	}
}
`;
    const issues = engine.validate(codeWithDocBlock, "php", testSettings);
    const methodGapIssues = issues.filter((i) => i.code === "nalemi.php.blank-lines-between-methods");
    import_node_assert.default.strictEqual(methodGapIssues.length, 0, "Should accept 2 blank lines before DocBlock");
    const badDocBlock = `<?php
class Helper {

	public function firstMethod() {

		return 1;
	}

	/**
	 * Popis metody
	 */
	public function secondMethod() {

		return 2;
	}
}
`;
    const badIssues = engine.validate(badDocBlock, "php", testSettings);
    const badGapIssues = badIssues.filter((i) => i.code === "nalemi.php.blank-lines-between-methods");
    import_node_assert.default.strictEqual(badGapIssues.length, 1, "Should report error when only 1 blank line before DocBlock");
  });
  (0, import_node_test.it)("Rule: Multi-line function signature with brace on same line as closing parenthesis", () => {
    const multilineSignature = `<?php
class CarHelper {

	public static function getStartTimeLastIntervalOfPublic(
		int $clanek_ixp
	): ?int {

		if ($condition) {
			return 1;
		}
	}
}
`;
    const issues = engine.validate(multilineSignature, "php", testSettings);
    const methodBraceIssues = issues.filter((i) => i.code === "nalemi.php.method-brace-same-line");
    import_node_assert.default.strictEqual(methodBraceIssues.length, 0, "Opening brace on the line where closing paren/return type is should pass");
  });
  (0, import_node_test.it)("Rule: Validate sample-test.php for clean and erroneous classes", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const sampleCode = fs.readFileSync(path.join(__dirname, "..", "sample-test.php"), "utf8");
    const issues = engine.validate(sampleCode, "php", testSettings);
    const issuesInCorrect = issues.filter(
      (i) => i.range.startLine >= 10 && i.range.startLine <= 26
    );
    import_node_assert.default.strictEqual(
      issuesInCorrect.length,
      0,
      `Expected 0 issues in CorrectCarHelper, found: ${JSON.stringify(issuesInCorrect)}`
    );
    const issuesInIncorrect = issues.filter((i) => i.range.startLine >= 35);
    import_node_assert.default.ok(
      issuesInIncorrect.some((i) => i.code === "nalemi.php.class-brace-same-line"),
      "Should flag IncorrectCarHelper class brace"
    );
    import_node_assert.default.ok(
      issuesInIncorrect.some((i) => i.code === "nalemi.php.method-brace-same-line"),
      "Should flag firstMethod brace"
    );
    import_node_assert.default.ok(
      issuesInIncorrect.some((i) => i.code === "nalemi.php.control-brace-same-line"),
      "Should flag if statement brace"
    );
    import_node_assert.default.ok(
      issuesInIncorrect.some((i) => i.code === "nalemi.php.blank-lines-between-methods"),
      "Should flag missing second blank line between methods"
    );
  });
  (0, import_node_test.it)("Rule: Validate Container.php formatted code with allow-empty-or-tabs", () => {
    const containerCode = `<?php

declare(strict_types=1);

namespace Core;

final class Container {

	/** @var array<string, callable|object> */
	private array $bindings = [];

	/** @var array<string, callable|object> */
	private array $singletons = [];

	/** @var array<string, mixed> */
	private array $instances = [];


	public function bind(string $abstract, callable|object $concrete): void {

		$this->bindings[$abstract] = $concrete;
	}


	public function singleton(string $abstract, callable|object $concrete): void {
		$this->singletons[$abstract] = $concrete;
	}


	public function make(string $class): mixed {

		return $this->resolve($class);
	}
}
`;
    const settingsAllow = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "allow-empty-or-tabs"
      }
    };
    const issues = engine.validate(containerCode, "php", settingsAllow);
    import_node_assert.default.strictEqual(
      issues.length,
      0,
      `Container.php should have 0 issues, but found: ${JSON.stringify(issues, null, 2)}`
    );
  });
  (0, import_node_test.it)("Rule: Empty line tab indentation level (1 tab in class, 2 tabs in method, 3+ in nested ifs)", () => {
    const tabsCode = [
      "<?php",
      "class TabLevelClass {",
      "	",
      "	public function calc($x) {",
      "		",
      "		$a = 1;",
      "		if ($x > 0) {",
      "			",
      "			return $x;",
      "		}",
      "		return $a;",
      "	}",
      "}"
    ].join("\n");
    const settingsTabs = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "tabs"
      }
    };
    const issuesGood = engine.validate(tabsCode, "php", settingsTabs);
    const tabIssues = issuesGood.filter((i) => i.code.startsWith("nalemi.common.empty-line"));
    const trailingIssues = issuesGood.filter((i) => i.code === "nalemi.common.trailing-whitespace");
    import_node_assert.default.strictEqual(tabIssues.length, 0, "Should accept proper tabs on blank lines");
    import_node_assert.default.strictEqual(trailingIssues.length, 0, "Tabs on blank lines must NOT be treated as trailing whitespace");
    const badTabsCode = [
      "<?php",
      "class TabLevelClass {",
      "	",
      "	public function calc($x) {",
      "	",
      // wrong! only 1 tab instead of 2
      "		$a = 1;",
      "		return $a;",
      "	}",
      "}"
    ].join("\n");
    const issuesBad = engine.validate(badTabsCode, "php", settingsTabs);
    const badTabIssues = issuesBad.filter((i) => i.code === "nalemi.common.empty-line-indent");
    import_node_assert.default.strictEqual(badTabIssues.length, 1);
    import_node_assert.default.ok(badTabIssues[0].message.includes("2 tabul\xE1tory"));
    const spacesBlankCode = [
      "<?php",
      "class TabLevelClass {",
      "  ",
      // wrong! spaces instead of tab
      "	public function calc($x) {",
      "		return $x;",
      "	}",
      "}"
    ].join("\n");
    const issuesSpaces = engine.validate(spacesBlankCode, "php", settingsTabs);
    const spaceIssues = issuesSpaces.filter((i) => i.code === "nalemi.common.empty-line-spaces");
    import_node_assert.default.strictEqual(spaceIssues.length, 1);
  });
  (0, import_node_test.it)("Rule: Trailing whitespace and tabs indentation", () => {
    const codeWithTrailingAndSpaces = `<?php
class SpacesClass {

    public function testSpaces() { 

		return 42;
	}
}
`;
    const issues = engine.validate(codeWithTrailingAndSpaces, "php", testSettings);
    const trailingIssues = issues.filter((i) => i.code === "nalemi.common.trailing-whitespace");
    const spaceIndentIssues = issues.filter((i) => i.code === "nalemi.common.indent-tabs");
    import_node_assert.default.ok(trailingIssues.length >= 1, "Should detect trailing whitespace");
    import_node_assert.default.ok(spaceIndentIssues.length >= 1, "Should detect space indentation when tabs expected");
  });
  (0, import_node_test.it)("Mixed PHP/HTML: Proper nesting depth when HTML parent indents nested PHP and vice versa", () => {
    const mixedTemplate = [
      '<div class="container">',
      '	<div class="row">',
      "		",
      "		<?php if ($show): ?>",
      '			<div class="col">',
      "				",
      "				<p>Hello</p>",
      "			</div>",
      "		<?php endif; ?>",
      "	</div>",
      "</div>"
    ].join("\n");
    const settingsTabs = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "tabs"
      }
    };
    const issues = engine.validate(mixedTemplate, "php", settingsTabs);
    const emptyLineIssues = issues.filter((i) => i.code.startsWith("nalemi.common.empty-line"));
    import_node_assert.default.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues, found: ${JSON.stringify(emptyLineIssues)}`);
  });
  (0, import_node_test.it)("Mixed PHP/HTML: Detect wrong tab count on empty lines in nested HTML and PHP", () => {
    const badMixedTemplate = [
      '<div class="container">',
      '	<div class="row">',
      "	",
      // wrong! should be 2 tabs
      "		<?php if ($show): ?>",
      '			<div class="col">',
      "		",
      // wrong! should be 4 tabs
      "				<p>Hello</p>",
      "			</div>",
      "		<?php endif; ?>",
      "	</div>",
      "</div>"
    ].join("\n");
    const settingsTabs = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "tabs"
      }
    };
    const issues = engine.validate(badMixedTemplate, "php", settingsTabs);
    const emptyLineIssues = issues.filter((i) => i.code === "nalemi.common.empty-line-indent");
    import_node_assert.default.strictEqual(emptyLineIssues.length, 2);
    import_node_assert.default.ok(emptyLineIssues[0].message.includes("2 tabul\xE1tory"));
    import_node_assert.default.ok(emptyLineIssues[1].message.includes("4 tabul\xE1tory"));
  });
  (0, import_node_test.it)('Mixed PHP/HTML: HTML class="..." and <script> function are not treated as PHP declarations', () => {
    const htmlWithClassesAndScript = [
      "<?php",
      '$title = "Test";',
      "?>",
      '<div class="btn btn-primary">',
      '	<span class="badge">Badge</span>',
      "</div>",
      "<script>",
      "	function jsFunction() {",
      '		console.log("ok");',
      "	}",
      "</script>"
    ].join("\n");
    const issues = engine.validate(htmlWithClassesAndScript, "php", testSettings);
    const classIssues = issues.filter((i) => i.code.includes("class-brace"));
    const methodIssues = issues.filter((i) => i.code.includes("method-brace") || i.code.includes("blank-line-after-brace"));
    import_node_assert.default.strictEqual(classIssues.length, 0, "HTML class attributes must not trigger PHP class brace rules");
    import_node_assert.default.strictEqual(methodIssues.length, 0, "JS functions in script tags must not trigger PHP method rules");
  });
  (0, import_node_test.it)("Mixed PHP/HTML: PHP method containing HTML markup inherits proper indentation", () => {
    const phpWithHtmlInside = [
      "<?php",
      "class CarView {",
      "	",
      "	public function render() {",
      "		?>",
      '		<div class="car">',
      "			<p>Car details</p>",
      "			",
      "		</div>",
      "		<?php",
      "	}",
      "}"
    ].join("\n");
    const settingsTabs = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "tabs"
      }
    };
    const issues = engine.validate(phpWithHtmlInside, "php", settingsTabs);
    const emptyLineIssues = issues.filter((i) => i.code.startsWith("nalemi.common.empty-line"));
    import_node_assert.default.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues in PHP with HTML, found: ${JSON.stringify(emptyLineIssues)}`);
  });
  (0, import_node_test.it)("Mixed PHP/HTML: Alternative syntax if, elseif, else branches with correct tabs on empty lines", () => {
    const altSyntaxTemplate = [
      "<?php if ($type === 1): ?>",
      "	<p>Type 1</p>",
      "	",
      "<?php elseif ($type === 2): ?>",
      "	<p>Type 2</p>",
      "	",
      "<?php else: ?>",
      "	<p>Other</p>",
      "	",
      "<?php endif; ?>"
    ].join("\n");
    const settingsTabs = {
      ...testSettings,
      common: {
        ...testSettings.common,
        emptyLineIndentation: "tabs"
      }
    };
    const issues = engine.validate(altSyntaxTemplate, "php", settingsTabs);
    const emptyLineIssues = issues.filter((i) => i.code.startsWith("nalemi.common.empty-line"));
    import_node_assert.default.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues in alternative syntax, found: ${JSON.stringify(emptyLineIssues)}`);
  });
});
//# sourceMappingURL=test.js.map
