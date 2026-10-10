import { DiagnosticIssue, Rule, RuleContext } from '../../core/types';

export class ControlBraceSameLineRule implements Rule {
	public id = 'nalemi.php.control-brace-same-line';
	public name = 'PHP Control Structure Opening Brace on Same Line';
	public languages = ['php'];

	public run(context: RuleContext): DiagnosticIssue[] {
		if (!context.settings.php.controlStructureBraceSameLine) {
			return [];
		}

		const issues: DiagnosticIssue[] = [];
		const analysis = context.phpAnalysis;
		if (!analysis) return [];

		for (const ctrl of analysis.controls) {
			if (!ctrl.openBrace) continue;

			if (ctrl.openBrace.line > ctrl.declarationEndLine) {
				const braceLineIndex = ctrl.openBrace.line;
				const declLineIndex = ctrl.declarationEndLine;
				const declLineText = context.lines[declLineIndex] || '';

				issues.push({
					code: this.id,
					message: `Otevírací složená závorka '{' pro řídicí strukturu '${ctrl.name || 'podmínku'}' musí být na stejném řádku.`,
					severity: 'warning',
					range: {
						startLine: braceLineIndex,
						startChar: ctrl.openBrace.char,
						endLine: braceLineIndex,
						endChar: ctrl.openBrace.char + 1,
					},
					fix: {
						title: `Přesunout otevírací závorku '{' na konec řádku s ${ctrl.name || 'podmínkou'}`,
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
