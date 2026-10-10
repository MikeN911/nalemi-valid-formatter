import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';
import { PHPTokenizer } from '../../languages/php/phpTokenizer';

export class IndentationAndWhitespaceRule implements Rule {
	public id = 'nalemi.common.whitespace';
	public name = 'Indentation and Whitespace Formatting';
	public languages = ['php', 'javascript', 'typescript', 'html', 'css'];

	public run(context: RuleContext): DiagnosticIssue[] {
		const issues: DiagnosticIssue[] = [];
		const lines = context.lines;
		const settings = context.settings.common;

		// Build a set of line numbers that are inside multi-line comments/DocBlocks
		const commentLines = new Set<number>();
		if (context.phpAnalysis) {
			for (const c of context.phpAnalysis.comments) {
				for (let l = c.startLine; l <= c.endLine; l++) {
					commentLines.add(l);
				}
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// 1. Blank line handling (emptyLineIndentation)
			if (line.trim().length === 0) {
				const expectedTabs = PHPTokenizer.getNestingDepth(i, context.phpAnalysis);
				const hasSpaces = line.includes(' ');
				const actualTabs = (line.match(/^\t*/)?.[0] || '').length;

				if (hasSpaces) {
					issues.push({
						code: 'nalemi.common.empty-line-spaces',
						message: 'Prázdný řádek nesmí obsahovat mezery, pouze tabulátory pro zachování úrovně.',
						severity: 'warning',
						range: {
							startLine: i,
							startChar: 0,
							endLine: i,
							endChar: line.length,
						},
						fix: {
							title: `Nahradit mezery za ${expectedTabs} tabulátor${expectedTabs === 1 ? '' : expectedTabs < 5 ? 'y' : 'ů'}`,
							edits: [
								{
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: line.length,
									newText: '\t'.repeat(expectedTabs),
								},
							],
						},
					});
				} else if (settings.emptyLineIndentation !== 'off') {
					if (settings.emptyLineIndentation === 'tabs') {
						if (actualTabs !== expectedTabs) {
							issues.push({
								code: 'nalemi.common.empty-line-indent',
								message: `Prázdný řádek by měl obsahovat ${expectedTabs} ${expectedTabs === 1 ? 'tabulátor' : expectedTabs < 5 ? 'tabulátory' : 'tabulátorů'} pro zachování úrovně odsazení (nalezeno ${actualTabs}).`,
								severity: 'warning',
								range: {
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: line.length,
								},
								fix: {
									title: `Upravit odsazení prázdného řádku na ${expectedTabs} tabulátor${expectedTabs === 1 ? '' : expectedTabs < 5 ? 'y' : 'ů'}`,
									edits: [
										{
											startLine: i,
											startChar: 0,
											endLine: i,
											endChar: line.length,
											newText: '\t'.repeat(expectedTabs),
										},
									],
								},
							});
						}
					} else if (settings.emptyLineIndentation === 'allow-empty-or-tabs') {
						if (actualTabs !== 0 && actualTabs !== expectedTabs) {
							issues.push({
								code: 'nalemi.common.empty-line-indent',
								message: `Prázdný řádek má nesprávný počet tabulátorů (nalezeno ${actualTabs}, očekáváno 0 nebo ${expectedTabs}).`,
								severity: 'warning',
								range: {
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: line.length,
								},
								fix: {
									title: `Upravit odsazení prázdného řádku na ${expectedTabs} tabulátor${expectedTabs === 1 ? '' : expectedTabs < 5 ? 'y' : 'ů'}`,
									edits: [
										{
											startLine: i,
											startChar: 0,
											endLine: i,
											endChar: line.length,
											newText: '\t'.repeat(expectedTabs),
										},
									],
								},
							});
						}
					} else if (settings.emptyLineIndentation === 'empty') {
						if (actualTabs > 0) {
							issues.push({
								code: 'nalemi.common.empty-line-indent',
								message: 'Prázdný řádek nesmí obsahovat tabulátory.',
								severity: 'warning',
								range: {
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: line.length,
								},
								fix: {
									title: 'Odstranit tabulátory z prázdného řádku',
									edits: [
										{
											startLine: i,
											startChar: 0,
											endLine: i,
											endChar: line.length,
											newText: '',
										},
									],
								},
							});
						}
					}
				}
				continue;
			}

			// 2. Trailing whitespace on non-empty lines
			if (settings.noTrailingWhitespace) {
				const match = /[ \t]+$/.exec(line);
				if (match) {
					const startIndex = match.index;
					issues.push({
						code: 'nalemi.common.trailing-whitespace',
						message: 'Řádek obsahuje zbytečné prázdné znaky na konci (trailing whitespace).',
						severity: 'warning',
						range: {
							startLine: i,
							startChar: startIndex,
							endLine: i,
							endChar: line.length,
						},
						fix: {
							title: 'Odstranit prázdné znaky na konci řádku',
							edits: [
								{
									startLine: i,
									startChar: startIndex,
									endLine: i,
									endChar: line.length,
									newText: '',
								},
							],
						},
					});
				}
			}

			// 2. Indentation check
			if (settings.indentType !== 'off' && line.trim().length > 0) {
				const leadingWhitespaceMatch = /^[ \t]+/.exec(line);
				if (leadingWhitespaceMatch) {
					const leadingWhitespace = leadingWhitespaceMatch[0];
					const isCommentLine = commentLines.has(i);

					if (settings.indentType === 'tabs') {
						// In DocBlocks, `\t * comment` is standard: tabs followed by ` *`
						if (isCommentLine && /^\t*\s*\*/.test(line)) {
							// Allowed docblock indentation
						} else if (/^ +/.test(leadingWhitespace)) {
							const expectedTabs = PHPTokenizer.getNestingDepth(i, context.phpAnalysis);
							const tabCount = expectedTabs > 0 ? expectedTabs : Math.max(1, Math.round(leadingWhitespace.length / 4));
							issues.push({
								code: 'nalemi.common.indent-tabs',
								message: 'Odsazení musí být prováděno tabulátory (\\t), nikoliv mezerami.',
								severity: 'warning',
								range: {
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: leadingWhitespace.length,
								},
								fix: {
									title: `Nahradit mezery za ${tabCount} tabulátor${tabCount === 1 ? '' : tabCount < 5 ? 'y' : 'ů'}`,
									edits: [
										{
											startLine: i,
											startChar: 0,
											endLine: i,
											endChar: leadingWhitespace.length,
											newText: '\t'.repeat(tabCount),
										},
									],
								},
							});
						}
					} else if (settings.indentType === 'spaces') {
						if (leadingWhitespace.includes('\t')) {
							issues.push({
								code: 'nalemi.common.indent-spaces',
								message: 'Odsazení musí být prováděno mezerami, nikoliv tabulátory.',
								severity: 'warning',
								range: {
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: leadingWhitespace.length,
								},
							});
						}
					}
				}
			}

			// 3. Space before opening brace on same line
			if (settings.spaceBeforeOpeningBrace) {
				// Search for `{` not at the beginning of the line, and not inside string/comment
				// e.g. `foo(){` (no space) or `foo()  {` (multiple spaces)
				const noSpaceBraceMatch = /([^\s\t])\{/.exec(line);
				if (noSpaceBraceMatch && !commentLines.has(i)) {
					const charPos = noSpaceBraceMatch.index + 1;
					// Ensure it's not string interpolation like "{$var}"
					if (noSpaceBraceMatch[1] !== '$' && noSpaceBraceMatch[1] !== '"' && noSpaceBraceMatch[1] !== "'") {
						issues.push({
							code: 'nalemi.common.space-before-brace',
							message: "Před otevírací složenou závorkou '{' chybí mezera.",
							severity: 'warning',
							range: {
								startLine: i,
								startChar: charPos,
								endLine: i,
								endChar: charPos + 1,
							},
							fix: {
								title: "Vložit mezeru před '{'",
								edits: [
									{
										startLine: i,
										startChar: charPos,
										endLine: i,
										endChar: charPos,
										newText: ' ',
									},
								],
							},
						});
					}
				}

				// Check for multiple spaces before `{`
				const multiSpaceBraceMatch = /([^\s\t])( {2,})\{/.exec(line);
				if (multiSpaceBraceMatch && !commentLines.has(i)) {
					const startSpacePos = multiSpaceBraceMatch.index + 1;
					const spaceLength = multiSpaceBraceMatch[2].length;
					issues.push({
						code: 'nalemi.common.single-space-before-brace',
						message: "Před otevírací složenou závorkou '{' má být právě jedna mezera.",
						severity: 'warning',
						range: {
							startLine: i,
							startChar: startSpacePos,
							endLine: i,
							endChar: startSpacePos + spaceLength,
						},
						fix: {
							title: 'Nahradit za jedinou mezeru',
							edits: [
								{
									startLine: i,
									startChar: startSpacePos,
									endLine: i,
									endChar: startSpacePos + spaceLength,
									newText: ' ',
								},
							],
						},
					});
				}
			}
		}

		return issues;
	}
}
