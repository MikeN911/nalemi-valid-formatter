import {
	ParsedBlock,
	ParsedClassStructure,
	ParsedMethodStructure,
	PHPFileAnalysis,
} from '../../core/types';

interface NestingScope {
	type: 'html' | 'php_brace' | 'php_alt';
	tagName?: string;
	startLine: number;
	blockRef?: ParsedBlock;
}

const HTML_VOID_ELEMENTS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

export class PHPTokenizer {
	/**
	 * Analyzuje PHP a HTML kód dokumentu a extrahuje strukturální informace:
	 * třídy, metody, funkce, řídicí struktury, komentáře, prázdné řádky a úrovně zanoření.
	 */
	public static analyze(text: string): PHPFileAnalysis {
		const lines = text.split(/\r?\n/);
		const blankLineIndices = new Set<number>();

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim().length === 0) {
				blankLineIndices.add(i);
			}
		}

		const classes: ParsedClassStructure[] = [];
		const functions: ParsedMethodStructure[] = [];
		const controls: ParsedBlock[] = [];
		const allBlocks: ParsedBlock[] = [];
		const comments: Array<{ startLine: number; endLine: number; isDocBlock: boolean }> = [];
		const completedScopes: Array<{ startLine: number; endLine: number }> = [];

		let i = 0;
		let line = 0;
		let char = 0;
		const len = text.length;

		function nextChar(): string {
			const c = text[i];
			if (c === '\n') {
				line++;
				char = 0;
			} else {
				char++;
			}
			i++;
			return c;
		}

		function peek(offset = 0): string {
			return i + offset < len ? text[i + offset] : '';
		}

		interface PendingDeclaration {
			type: 'class' | 'interface' | 'trait' | 'method' | 'function' | 'control';
			name?: string;
			startLine: number;
			startChar: number;
			endLine: number;
			endChar: number;
			headerText: string;
			docBlockStartLine?: number;
			docBlockEndLine?: number;
			isMethod?: boolean;
			controlKeyword?: string;
		}

		const blockStack: Array<ParsedClassStructure | ParsedMethodStructure | ParsedBlock> = [];
		const scopeStack: NestingScope[] = [];
		let pendingDecl: PendingDeclaration | null = null;
		let parenDepth = 0;
		let inPHP = false;
		let lastDocBlock: { startLine: number; endLine: number } | null = null;

		function pushScope(scope: NestingScope) {
			scopeStack.push(scope);
		}

		function popScope(scope: NestingScope, endLine: number) {
			completedScopes.push({ startLine: scope.startLine, endLine });
		}

		while (i < len) {
			const c = peek();

			// Režim HTML (mimo PHP bloky)
			if (!inPHP) {
				// 1. Přepnutí do PHP: <?php, <?=, <?
				if (c === '<' && peek(1) === '?') {
					if (text.slice(i, i + 5).toLowerCase() === '<?php') {
						nextChar(); nextChar(); nextChar(); nextChar(); nextChar();
						inPHP = true;
						continue;
					}
					if (text.slice(i, i + 3) === '<?=') {
						nextChar(); nextChar(); nextChar();
						inPHP = true;
						continue;
					}
					if (text.slice(i, i + 5).toLowerCase() === '<?xml') {
						// XML deklarace <?xml ... ?>
						nextChar(); nextChar();
						while (i < len && !(peek() === '?' && peek(1) === '>')) {
							nextChar();
						}
						if (i < len) { nextChar(); nextChar(); }
						continue;
					}
					// Zkrácený tag <?
					nextChar(); nextChar();
					inPHP = true;
					continue;
				}

				// 2. HTML komentáře <!-- ... -->
				if (c === '<' && peek(1) === '!' && peek(2) === '-' && peek(3) === '-') {
					const commentStart = line;
					nextChar(); nextChar(); nextChar(); nextChar();
					while (i < len && !(peek() === '-' && peek(1) === '-' && peek(2) === '>')) {
						nextChar();
					}
					if (i < len) {
						nextChar(); nextChar(); nextChar();
					}
					comments.push({ startLine: commentStart, endLine: line, isDocBlock: false });
					continue;
				}

				// 3. DOCTYPE / CDATA
				if (c === '<' && peek(1) === '!') {
					if (text.slice(i + 2, i + 9).toLowerCase() === 'doctype') {
						while (i < len && peek() !== '>') {
							nextChar();
						}
						if (i < len) nextChar();
						continue;
					}
					if (text.slice(i + 2, i + 9) === '[cdata[') {
						while (i < len && !(peek() === ']' && peek(1) === ']' && peek(2) === '>')) {
							nextChar();
						}
						if (i < len) {
							nextChar(); nextChar(); nextChar();
						}
						continue;
					}
				}

				// 4. HTML uzavírací tag </tag>
				if (c === '<' && peek(1) === '/') {
					nextChar(); nextChar(); // přeskočit </
					let tagName = '';
					while (i < len && /[a-zA-Z0-9_\-]/.test(peek())) {
						tagName += nextChar();
					}
					tagName = tagName.toLowerCase();
					while (i < len && peek() !== '>') {
						nextChar();
					}
					if (i < len) nextChar(); // přeskočit >

					// Najdeme odpovídající HTML tag v zásobníku
					let matchIdx = -1;
					for (let s = scopeStack.length - 1; s >= 0; s--) {
						if (scopeStack[s].type === 'html' && scopeStack[s].tagName === tagName) {
							matchIdx = s;
							break;
						}
					}
					if (matchIdx !== -1) {
						while (scopeStack.length > matchIdx) {
							const popped = scopeStack.pop()!;
							popScope(popped, line);
						}
					}
					continue;
				}

				// 5. HTML otevírací tag <tag ...>
				if (c === '<' && /[a-zA-Z]/.test(peek(1))) {
					nextChar(); // přeskočit <
					let tagName = '';
					while (i < len && /[a-zA-Z0-9_\-]/.test(peek())) {
						tagName += nextChar();
					}
					tagName = tagName.toLowerCase();

					let isSelfClosing = false;
					// Procházíme atributy až po konec tagu > nebo />
					while (i < len) {
						// Vnořené PHP uvnitř atributů tagu (např. <div class="<?=$cls?>">)
						if (peek() === '<' && peek(1) === '?') {
							nextChar(); nextChar();
							while (i < len && !(peek() === '?' && peek(1) === '>')) {
								if (peek() === '\'' || peek() === '"') {
									const q = nextChar();
									while (i < len && peek() !== q) {
										if (peek() === '\\') nextChar();
										nextChar();
									}
									if (i < len) nextChar();
								} else {
									nextChar();
								}
							}
							if (i < len) {
								nextChar(); nextChar();
							}
							continue;
						}

						// Hodnoty atributů v uvozovkách
						if (peek() === '"' || peek() === '\'') {
							const q = nextChar();
							while (i < len && peek() !== q) {
								if (peek() === '<' && peek(1) === '?') {
									nextChar(); nextChar();
									while (i < len && !(peek() === '?' && peek(1) === '>')) {
										nextChar();
									}
									if (i < len) {
										nextChar(); nextChar();
									}
									continue;
								}
								if (peek() === '\\') nextChar();
								nextChar();
							}
							if (i < len) nextChar();
							continue;
						}

						if (peek() === '/' && peek(1) === '>') {
							nextChar(); nextChar();
							isSelfClosing = true;
							break;
						}

						if (peek() === '>') {
							nextChar();
							break;
						}

						nextChar();
					}

					// Pokud tag není void a není samouzavírací, otevře novou úroveň odsazení
					if (!isSelfClosing && !HTML_VOID_ELEMENTS.has(tagName)) {
						pushScope({ type: 'html', tagName, startLine: line });
					}
					continue;
				}

				// Jiný znak v HTML režimu
				nextChar();
				continue;
			}

			// Režim PHP
			// 1. Ukončení PHP bloku: ?>
			if (c === '?' && peek(1) === '>') {
				nextChar(); nextChar();
				inPHP = false;
				continue;
			}

			// 2. Řetězce v PHP
			if (c === '\'' || c === '"') {
				const quote = c;
				nextChar();
				while (i < len) {
					const sc = peek();
					if (sc === '\\') {
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

			// Heredoc / Nowdoc <<<
			if (c === '<' && peek(1) === '<' && peek(2) === '<') {
				nextChar(); nextChar(); nextChar();
				while (i < len && (peek() === ' ' || peek() === '\t')) {
					nextChar();
				}
				let quoteChar = '';
				if (peek() === '\'' || peek() === '"') {
					quoteChar = nextChar();
				}
				let id = '';
				while (i < len && /[A-Za-z0-9_]/.test(peek())) {
					id += nextChar();
				}
				if (quoteChar && peek() === quoteChar) {
					nextChar();
				}
				while (i < len) {
					if (peek() === '\n') {
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
							if (peek() === ';') {
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

			// 3. Komentáře v PHP
			// Víceřádkový komentář /* nebo /**
			if (c === '/' && peek(1) === '*') {
				const commentStartLine = line;
				const isDocBlock = peek(2) === '*' && peek(3) !== '/';
				nextChar(); nextChar();
				while (i < len) {
					if (peek() === '*' && peek(1) === '/') {
						nextChar(); nextChar();
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

			// Jednořádkový komentář // nebo #
			if ((c === '/' && peek(1) === '/') || c === '#') {
				const commentStartLine = line;
				nextChar();
				if (c === '/') nextChar();
				while (i < len && peek() !== '\n') {
					nextChar();
				}
				comments.push({ startLine: commentStartLine, endLine: commentStartLine, isDocBlock: false });
				continue;
			}

			// 4. Kulaté závorky (parametry funkcí, podmínky)
			if (c === '(') {
				parenDepth++;
				nextChar();
				continue;
			}
			if (c === ')') {
				if (parenDepth > 0) parenDepth--;
				if (pendingDecl) {
					pendingDecl.endLine = line;
					pendingDecl.endChar = char;
				}
				nextChar();
				continue;
			}

			// 5. Identifikátory a klíčová slova v PHP
			if (/[A-Za-z0-9_]/.test(c)) {
				const wordStartLine = line;
				const wordStartChar = char;
				let word = '';
				while (i < len && /[A-Za-z0-9_]/.test(peek())) {
					word += nextChar();
				}

				const lowerWord = word.toLowerCase();

				if (parenDepth === 0) {
					if (lowerWord === 'class' || lowerWord === 'interface' || lowerWord === 'trait' || lowerWord === 'enum') {
						let name = '';
						while (i < len && (peek() === ' ' || peek() === '\t')) {
							nextChar();
						}
						while (i < len && /[A-Za-z0-9_]/.test(peek())) {
							name += nextChar();
						}

						pendingDecl = {
							type: lowerWord === 'class' ? 'class' : lowerWord === 'interface' ? 'interface' : 'trait',
							name: name || undefined,
							startLine: wordStartLine,
							startChar: wordStartChar,
							endLine: line,
							endChar: char,
							headerText: lines[wordStartLine] || '',
							docBlockStartLine: lastDocBlock && (wordStartLine - lastDocBlock.endLine <= 1) ? lastDocBlock.startLine : undefined,
							docBlockEndLine: lastDocBlock && (wordStartLine - lastDocBlock.endLine <= 1) ? lastDocBlock.endLine : undefined,
						};
						lastDocBlock = null;
					} else if (lowerWord === 'function') {
						const parent = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;
						const isMethod = !!parent && (parent.type === 'class' || parent.type === 'trait' || parent.type === 'interface');

						while (i < len && (peek() === ' ' || peek() === '\t' || peek() === '&')) {
							nextChar();
						}
						let name = '';
						while (i < len && /[A-Za-z0-9_]/.test(peek())) {
							name += nextChar();
						}

						pendingDecl = {
							type: isMethod ? 'method' : 'function',
							name: name || undefined,
							startLine: wordStartLine,
							startChar: wordStartChar,
							endLine: line,
							endChar: char,
							headerText: lines[wordStartLine] || '',
							docBlockStartLine: lastDocBlock && (wordStartLine - lastDocBlock.endLine <= 1) ? lastDocBlock.startLine : undefined,
							docBlockEndLine: lastDocBlock && (wordStartLine - lastDocBlock.endLine <= 1) ? lastDocBlock.endLine : undefined,
							isMethod,
						};
						lastDocBlock = null;
					} else if (
						['if', 'elseif', 'else', 'while', 'for', 'foreach', 'switch', 'try', 'catch', 'finally', 'do'].includes(lowerWord)
					) {
						pendingDecl = {
							type: 'control',
							name: lowerWord,
							controlKeyword: lowerWord,
							startLine: wordStartLine,
							startChar: wordStartChar,
							endLine: line,
							endChar: char,
							headerText: lines[wordStartLine] || '',
						};
					} else if (
						['endif', 'endforeach', 'endfor', 'endwhile', 'endswitch'].includes(lowerWord)
					) {
						// Uzavření alternativní PHP syntaxe (: ... endif;)
						let matchIdx = -1;
						for (let s = scopeStack.length - 1; s >= 0; s--) {
							if (scopeStack[s].type === 'php_alt') {
								matchIdx = s;
								break;
							}
						}
						if (matchIdx !== -1) {
							while (scopeStack.length > matchIdx) {
								const popped = scopeStack.pop()!;
								popScope(popped, line);
							}
						}
					} else if (pendingDecl) {
						pendingDecl.endLine = line;
						pendingDecl.endChar = char;
						pendingDecl.headerText = lines[line] || '';
					}
				} else if (pendingDecl) {
					pendingDecl.endLine = line;
					pendingDecl.endChar = char;
				}
				continue;
			}

			// 6. Dvojtečka : v PHP režimu (alternativní syntaxe řídicích struktur v šablonách)
			if (c === ':' && parenDepth === 0 && pendingDecl) {
				const kw = pendingDecl.controlKeyword || '';
				if (kw === 'else' || kw === 'elseif') {
					// Výměna větve v alternativní syntaxi (uzavře předchozí větev na tomto řádku a otevře novou)
					let matchIdx = -1;
					for (let s = scopeStack.length - 1; s >= 0; s--) {
						if (scopeStack[s].type === 'php_alt') {
							matchIdx = s;
							break;
						}
					}
					if (matchIdx !== -1) {
						const popped = scopeStack.splice(matchIdx, 1)[0];
						popScope(popped, line);
					}
					pushScope({ type: 'php_alt', startLine: line });
					pendingDecl = null;
					nextChar();
					continue;
				} else if (['if', 'for', 'foreach', 'while', 'switch'].includes(kw)) {
					pushScope({ type: 'php_alt', startLine: line });
					pendingDecl = null;
					nextChar();
					continue;
				}
			}

			// 7. Středník ; (abstraktní metody, rozhraní)
			if (c === ';') {
				if (pendingDecl) {
					pendingDecl = null;
				}
				nextChar();
				continue;
			}

			// 8. Složené závorky { a } v PHP
			if (c === '{') {
				const braceLine = line;
				const braceChar = char;
				nextChar();

				if (pendingDecl) {
					const decl = pendingDecl;
					pendingDecl = null;

					if (decl.type === 'class' || decl.type === 'interface' || decl.type === 'trait') {
						const classObj: ParsedClassStructure = {
							type: decl.type,
							name: decl.name,
							declarationStartLine: decl.startLine,
							declarationEndLine: decl.endLine,
							headerText: decl.headerText,
							openBrace: { line: braceLine, char: braceChar },
							docBlockStartLine: decl.docBlockStartLine,
							docBlockEndLine: decl.docBlockEndLine,
							methods: [],
						};
						classes.push(classObj);
						blockStack.push(classObj);
						allBlocks.push(classObj);
						pushScope({ type: 'php_brace', startLine: braceLine, blockRef: classObj });
					} else if (decl.type === 'method' || decl.type === 'function') {
						const parent = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;
						const methodObj: ParsedMethodStructure = {
							type: decl.type,
							name: decl.name,
							declarationStartLine: decl.startLine,
							declarationEndLine: decl.endLine,
							headerText: decl.headerText,
							openBrace: { line: braceLine, char: braceChar },
							docBlockStartLine: decl.docBlockStartLine,
							docBlockEndLine: decl.docBlockEndLine,
							isMethod: !!decl.isMethod,
							className: parent && parent.type === 'class' ? parent.name : undefined,
						};
						if (decl.isMethod && parent && (parent.type === 'class' || parent.type === 'trait' || parent.type === 'interface')) {
							(parent as ParsedClassStructure).methods.push(methodObj);
						} else {
							functions.push(methodObj);
						}
						blockStack.push(methodObj);
						allBlocks.push(methodObj);
						pushScope({ type: 'php_brace', startLine: braceLine, blockRef: methodObj });
					} else if (decl.type === 'control') {
						const controlObj: ParsedBlock = {
							type: 'control',
							name: decl.controlKeyword,
							declarationStartLine: decl.startLine,
							declarationEndLine: decl.endLine,
							headerText: decl.headerText,
							openBrace: { line: braceLine, char: braceChar },
						};
						controls.push(controlObj);
						blockStack.push(controlObj);
						allBlocks.push(controlObj);
						pushScope({ type: 'php_brace', startLine: braceLine, blockRef: controlObj });
					}
				} else {
					const anonBlock: ParsedBlock = {
						type: 'control',
						declarationStartLine: braceLine,
						declarationEndLine: braceLine,
						headerText: '',
						openBrace: { line: braceLine, char: braceChar },
					};
					blockStack.push(anonBlock);
					allBlocks.push(anonBlock);
					pushScope({ type: 'php_brace', startLine: braceLine, blockRef: anonBlock });
				}
				continue;
			}

			if (c === '}') {
				const closeLine = line;
				const closeChar = char;
				nextChar();

				if (blockStack.length > 0) {
					const popped = blockStack.pop()!;
					popped.closeBrace = { line: closeLine, char: closeChar };
					if (popped.openBrace && popped.openBrace.line === closeLine) {
						popped.isSingleLine = true;
					}
				}

				let matchIdx = -1;
				for (let s = scopeStack.length - 1; s >= 0; s--) {
					if (scopeStack[s].type === 'php_brace') {
						matchIdx = s;
						break;
					}
				}
				if (matchIdx !== -1) {
					while (scopeStack.length > matchIdx) {
						const pScope = scopeStack.pop()!;
						popScope(pScope, closeLine);
					}
				}
				continue;
			}

			nextChar();
		}

		// Uzavření zbývajících otevřených rozsahů na konci souboru
		while (scopeStack.length > 0) {
			const pScope = scopeStack.pop()!;
			popScope(pScope, lines.length);
		}

		// Výpočet přesné úrovně zanoření (počet tabulátorů) pro každý řádek souboru
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

		const lineDepths: number[] = new Array(lines.length).fill(baseIndent);
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
			lineDepths,
		};
	}

	/**
	 * Vrací přesnou úroveň zanoření (počet tabulátorů) pro daný řádek souboru.
	 */
	public static getNestingDepth(line: number, analysis?: PHPFileAnalysis): number {
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
}
