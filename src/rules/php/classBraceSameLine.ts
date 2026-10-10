import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';

export class ClassBraceSameLineRule implements Rule {
	public id = 'nalemi.php.class-brace-same-line';
	public name = 'PHP Class Opening Brace on Same Line';
	public languages = ['php'];

	public run(context: RuleContext): DiagnosticIssue[] {
		if (!context.settings.php.openingBraceSameLine) {
			return [];
		}

		const issues: DiagnosticIssue[] = [];
		const analysis = context.phpAnalysis;
		if (!analysis) return [];

		for (const cls of analysis.classes) {
			if (!cls.openBrace) continue;

			// If open brace is on a line after the declaration ended
			if (cls.openBrace.line > cls.declarationEndLine) {
				const braceLineIndex = cls.openBrace.line;
				const declLineIndex = cls.declarationEndLine;
				const declLineText = context.lines[declLineIndex] || '';

				issues.push({
					code: this.id,
					message: `Otevírací složená závorka '{' pro ${cls.type} '${cls.name || ''}' musí být na stejném řádku jako definice.`,
					severity: 'warning',
					range: {
						startLine: braceLineIndex,
						startChar: cls.openBrace.char,
						endLine: braceLineIndex,
						endChar: cls.openBrace.char + 1,
					},
					fix: {
						title: `Přesunout otevírací závorku '{' na konec definice ${cls.type}`,
						edits: [
							// Add " {" at end of decl line
							{
								startLine: declLineIndex,
								startChar: declLineText.length,
								endLine: declLineIndex,
								endChar: declLineText.length,
								newText: ' {',
							},
							// Remove the line with "{"
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
