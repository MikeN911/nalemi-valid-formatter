import { Rule, PHPFileAnalysis } from '../../core/types';
import { PHPTokenizer } from './phpTokenizer';
import { ClassBraceSameLineRule } from '../../rules/php/classBraceSameLine';
import { MethodBraceSameLineRule } from '../../rules/php/methodBraceSameLine';
import { ControlBraceSameLineRule } from '../../rules/php/controlBraceSameLine';
import { BlankLineAfterBraceRule } from '../../rules/php/blankLineAfterBrace';
import { BlankLinesBetweenMethodsRule } from '../../rules/php/blankLinesBetweenMethods';
import { IndentationAndWhitespaceRule } from '../../rules/common/indentationAndWhitespace';

export class PHPLanguageProvider {
	public static readonly languageId = 'php';

	public static getRules(): Rule[] {
		return [
			new ClassBraceSameLineRule(),
			new MethodBraceSameLineRule(),
			new ControlBraceSameLineRule(),
			new BlankLineAfterBraceRule(),
			new BlankLinesBetweenMethodsRule(),
			new IndentationAndWhitespaceRule(),
		];
	}

	public static analyze(text: string): PHPFileAnalysis {
		return PHPTokenizer.analyze(text);
	}
}
