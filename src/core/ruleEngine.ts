import {
	DiagnosticIssue,
	FormattingSettings,
	Rule,
	RuleContext,
} from './types';
import { PHPLanguageProvider } from '../languages/php/phpProvider';

export class RuleEngine {
	private rules: Map<string, Rule[]> = new Map();

	constructor() {
		this.registerLanguageRules(
			PHPLanguageProvider.languageId,
			PHPLanguageProvider.getRules()
		);
	}

	public registerLanguageRules(languageId: string, rules: Rule[]): void {
		const existing = this.rules.get(languageId) || [];
		this.rules.set(languageId, [...existing, ...rules]);
	}

	public validate(
		documentText: string,
		languageId: string,
		settings: FormattingSettings
	): DiagnosticIssue[] {
		if (!settings.enable) {
			return [];
		}

		const rules = this.rules.get(languageId);
		if (!rules || rules.length === 0) {
			return [];
		}

		const lines = documentText.split(/\r?\n/);
		const context: RuleContext = {
			documentText,
			lines,
			lineCount: lines.length,
			settings,
			languageId,
		};

		if (languageId === 'php') {
			context.phpAnalysis = PHPLanguageProvider.analyze(documentText);
		}

		const allIssues: DiagnosticIssue[] = [];
		for (const rule of rules) {
			try {
				const issues = rule.run(context);
				allIssues.push(...issues);
			} catch (err) {
				console.error(`Chyba při běhu pravidla ${rule.id}:`, err);
			}
		}

		return allIssues;
	}
}
