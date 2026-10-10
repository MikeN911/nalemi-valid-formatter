import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';
import { PHPTokenizer } from '../../languages/php/phpTokenizer';

export class BlankLineAfterBraceRule implements Rule {
	public id = 'nalemi.php.blank-line-after-brace';
	public name = 'PHP Blank Line After Class and Method Opening Brace';
	public languages = ['php'];

	public run(context: RuleContext): DiagnosticIssue[] {
		const issues: DiagnosticIssue[] = [];
		const analysis = context.phpAnalysis;
		if (!analysis) return [];

		const lines = context.lines;

		const countBlankLines = (startLine: number): number => {
			let count = 0;
			let idx = startLine;
			while (idx < lines.length && lines[idx].trim().length === 0) {
				count++;
				idx++;
			}
			return count;
		};

		// 1. Classes
		const expectedClassBlanks = context.settings.php.blankLineAfterClassBrace;
		for (const cls of analysis.classes) {
			if (!cls.openBrace || cls.isSingleLine) continue;

			// If empty class e.g. class Foo {\n}
			if (cls.closeBrace && cls.closeBrace.line === cls.openBrace.line + 1) {
				continue;
			}

			const startCheckLine = cls.openBrace.line + 1;
			const actualBlanks = countBlankLines(startCheckLine);

			if (actualBlanks !== expectedClassBlanks) {
				const diff = expectedClassBlanks - actualBlanks;
				issues.push({
					code: `${this.id}.class`,
					message:
						actualBlanks < expectedClassBlanks
							? `Ihned pod deklarací třídy '${cls.name || ''}' (za '{') musí být ${expectedClassBlanks} prázdný řádek (nalezeno ${actualBlanks}).`
							: `Příliš mnoho prázdných řádků za otevírací závorkou třídy '${cls.name || ''}' (nalezeno ${actualBlanks}, očekáváno ${expectedClassBlanks}).`,
					severity: 'warning',
					range: {
						startLine: cls.openBrace.line,
						startChar: cls.openBrace.char,
						endLine: cls.openBrace.line,
						endChar: cls.openBrace.char + 1,
					},
					fix: {
						title: actualBlanks < expectedClassBlanks
							? `Vložit ${diff} prázdný řádek za '{'`
							: `Upravit na ${expectedClassBlanks} prázdný řádek`,
						edits: actualBlanks < expectedClassBlanks
							? [
									{
										startLine: cls.openBrace.line + 1,
										startChar: 0,
										endLine: cls.openBrace.line + 1,
										endChar: 0,
										newText: context.settings.common.emptyLineIndentation === 'tabs'
											? ('\t'.repeat(PHPTokenizer.getNestingDepth(cls.openBrace.line + 1, context.phpAnalysis)) + '\n').repeat(diff)
											: '\n'.repeat(diff),
									},
								]
							: [
									{
										startLine: cls.openBrace.line + 1 + expectedClassBlanks,
										startChar: 0,
										endLine: cls.openBrace.line + 1 + actualBlanks,
										endChar: 0,
										newText: '',
									},
								],
					},
				});
			}
		}

		// 2. Methods and Functions
		const expectedMethodBlanks = context.settings.php.blankLineAfterMethodBrace;
		const allMethods = [
			...analysis.functions,
			...analysis.classes.flatMap((c) => c.methods),
		];

		for (const method of allMethods) {
			if (!method.openBrace || method.isSingleLine) continue;

			// If empty method e.g. function foo() {\n}
			if (method.closeBrace && method.closeBrace.line === method.openBrace.line + 1) {
				continue;
			}

			const startCheckLine = method.openBrace.line + 1;
			const actualBlanks = countBlankLines(startCheckLine);

			// Count non-empty, non-comment lines of code inside the method body
			const bodyEndLine = (method.closeBrace ? method.closeBrace.line : lines.length) - 1;
			let codeLineCount = 0;
			for (let l = startCheckLine; l <= bodyEndLine; l++) {
				const trimmed = lines[l].trim();
				if (trimmed.length === 0) continue;
				if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
				if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/')) continue;
				codeLineCount++;
			}

			// If method body contains only 1 line of code, blank line after declaration is optional (0 or 1 is allowed)
			if (codeLineCount <= 1) {
				if (actualBlanks > 1) {
					issues.push({
						code: `${this.id}.method`,
						message: `Příliš mnoho prázdných řádků za otevírací závorkou ${method.isMethod ? 'metody' : 'funkce'} '${method.name || ''}()' (nalezeno ${actualBlanks}, povolen maximálně 1).`,
						severity: 'warning',
						range: {
							startLine: method.openBrace.line,
							startChar: method.openBrace.char,
							endLine: method.openBrace.line,
							endChar: method.openBrace.char + 1,
						},
						fix: {
							title: 'Upravit na 1 prázdný řádek',
							edits: [
								{
									startLine: method.openBrace.line + 2,
									startChar: 0,
									endLine: method.openBrace.line + 1 + actualBlanks,
									endChar: 0,
									newText: '',
								},
							],
						},
					});
				}
				continue;
			}

			// Multi-line code inside method body requires exactly expectedMethodBlanks
			if (actualBlanks !== expectedMethodBlanks) {
				const diff = expectedMethodBlanks - actualBlanks;
				issues.push({
					code: `${this.id}.method`,
					message:
						actualBlanks < expectedMethodBlanks
							? `Ihned pod otevírací závorkou ${method.isMethod ? 'metody' : 'funkce'} '${method.name || ''}()' musí být ${expectedMethodBlanks} prázdný řádek (nalezeno ${actualBlanks}).`
							: `Příliš mnoho prázdných řádků za otevírací závorkou ${method.isMethod ? 'metody' : 'funkce'} '${method.name || ''}()' (nalezeno ${actualBlanks}, očekáváno ${expectedMethodBlanks}).`,
					severity: 'warning',
					range: {
						startLine: method.openBrace.line,
						startChar: method.openBrace.char,
						endLine: method.openBrace.line,
						endChar: method.openBrace.char + 1,
					},
					fix: {
						title: actualBlanks < expectedMethodBlanks
							? `Vložit ${diff} prázdný řádek za '{'`
							: `Upravit na ${expectedMethodBlanks} prázdný řádek`,
						edits: actualBlanks < expectedMethodBlanks
							? [
									{
										startLine: method.openBrace.line + 1,
										startChar: 0,
										endLine: method.openBrace.line + 1,
										endChar: 0,
										newText: context.settings.common.emptyLineIndentation === 'tabs'
											? ('\t'.repeat(PHPTokenizer.getNestingDepth(method.openBrace.line + 1, context.phpAnalysis)) + '\n').repeat(diff)
											: '\n'.repeat(diff),
									},
								]
							: [
									{
										startLine: method.openBrace.line + 1 + expectedMethodBlanks,
										startChar: 0,
										endLine: method.openBrace.line + 1 + actualBlanks,
										endChar: 0,
										newText: '',
									},
								],
					},
				});
			}
		}

		return issues;
	}
}
