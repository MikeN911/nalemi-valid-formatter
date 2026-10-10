import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';

export class MethodBraceSameLineRule implements Rule {
	public id = 'nalemi.php.method-brace-same-line';
	public name = 'PHP Method/Function Opening Brace on Same Line';
	public languages = ['php'];

	public run(context: RuleContext): DiagnosticIssue[] {
		if (!context.settings.php.openingBraceSameLine) {
			return [];
		}

		const issues: DiagnosticIssue[] = [];
		const analysis = context.phpAnalysis;
		if (!analysis) return [];

		// Collect all methods inside classes plus standalone functions
		const allMethods = [
			...analysis.functions,
			...analysis.classes.flatMap((c) => c.methods),
		];

		for (const method of allMethods) {
			if (!method.openBrace) continue;

			if (method.openBrace.line > method.declarationEndLine) {
				const braceLineIndex = method.openBrace.line;
				const declLineIndex = method.declarationEndLine;
				const declLineText = context.lines[declLineIndex] || '';

				issues.push({
					code: this.id,
					message: `Otevírací složená závorka '{' pro ${method.isMethod ? 'metodu' : 'funkci'} '${method.name || ''}()' musí být na stejném řádku.`,
					severity: 'warning',
					range: {
						startLine: braceLineIndex,
						startChar: method.openBrace.char,
						endLine: braceLineIndex,
						endChar: method.openBrace.char + 1,
					},
					fix: {
						title: `Přesunout otevírací závorku '{' na konec deklarace ${method.isMethod ? 'metody' : 'funkce'}`,
						edits: [
							{
								startLine: declLineIndex,
								startChar: declLineText.length,
								endLine: declLineIndex,
								endChar: declLineText.length,
								newText: ' {',
							},
							{
								startLine: braceLineIndex,
								startChar: 0,
								endLine: braceLineIndex + 1,
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
