import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';

export class BlankLinesBetweenMethodsRule implements Rule {
	public id = 'nalemi.php.blank-lines-between-methods';
	public name = 'PHP Two Blank Lines Between Methods';
	public languages = ['php'];

	public run(context: RuleContext): DiagnosticIssue[] {
		const issues: DiagnosticIssue[] = [];
		const analysis = context.phpAnalysis;
		if (!analysis) return [];

		const expectedBlanks = context.settings.php.blankLinesBetweenMethods;
		const lines = context.lines;

		for (const cls of analysis.classes) {
			const methods = cls.methods.filter((m) => m.openBrace && m.closeBrace);
			if (methods.length < 2) continue;

			// Sort by appearance in file
			methods.sort((a, b) => a.declarationStartLine - b.declarationStartLine);

			for (let i = 0; i < methods.length - 1; i++) {
				const current = methods[i];
				const next = methods[i + 1];

				if (!current.closeBrace) continue;

				const currentEndLine = current.closeBrace.line;
				const nextStartLine = next.docBlockStartLine !== undefined ? next.docBlockStartLine : next.declarationStartLine;

				if (nextStartLine <= currentEndLine) {
					continue;
				}

				// Count blank lines strictly between current close brace and next declaration/docblock
				let blankCount = 0;
				let allBlank = true;
				for (let lineIdx = currentEndLine + 1; lineIdx < nextStartLine; lineIdx++) {
					if (lines[lineIdx].trim().length === 0) {
						blankCount++;
					} else {
						allBlank = false;
					}
				}

				const actualBlanks = allBlank ? (nextStartLine - currentEndLine - 1) : blankCount;

				if (actualBlanks !== expectedBlanks) {
					const diff = expectedBlanks - actualBlanks;
					issues.push({
						code: this.id,
						message: `Mezi metodami '${current.name || ''}()' a '${next.name || ''}()' musí být právě ${expectedBlanks} prázdné řádky (nalezeno: ${actualBlanks}).`,
						severity: 'warning',
						range: {
							startLine: currentEndLine + 1 < nextStartLine ? currentEndLine + 1 : nextStartLine,
							startChar: 0,
							endLine: nextStartLine,
							endChar: (lines[nextStartLine] || '').length,
						},
						fix: {
							title: actualBlanks < expectedBlanks
								? `Doplnit ${diff} prázdný řádek mezi metodami`
								: `Upravit mezeru mezi metodami na ${expectedBlanks} prázdné řádky`,
							edits: [
								{
									startLine: currentEndLine + 1,
									startChar: 0,
									endLine: nextStartLine,
									endChar: 0,
									newText: context.settings.common.emptyLineIndentation === 'tabs'
										? '\t\n'.repeat(expectedBlanks)
										: '\n'.repeat(expectedBlanks),
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
