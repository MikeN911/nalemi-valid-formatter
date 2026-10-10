export type Severity = 'error' | 'warning' | 'info';

export interface TextRange {
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
}

export interface TextEditOperation {
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
	newText: string;
}

export interface DiagnosticIssue {
	code: string;
	message: string;
	range: TextRange;
	severity: Severity;
	fix?: {
		title: string;
		edits: TextEditOperation[];
	};
}

export interface FormattingSettings {
	enable: boolean;
	validateOn: 'type' | 'save';
	php: {
		openingBraceSameLine: boolean;
		controlStructureBraceSameLine: boolean;
		blankLineAfterClassBrace: number;
		blankLineAfterMethodBrace: number;
		blankLinesBetweenMethods: number;
	};
	common: {
		indentType: 'tabs' | 'spaces' | 'off';
		noTrailingWhitespace: boolean;
		spaceBeforeOpeningBrace: boolean;
		emptyLineIndentation: 'tabs' | 'allow-empty-or-tabs' | 'empty' | 'off';
	};
}

export interface ParsedBlock {
	type: 'class' | 'interface' | 'trait' | 'method' | 'function' | 'control';
	name?: string;
	declarationStartLine: number;
	declarationEndLine: number;
	headerText: string;
	openBrace?: {
		line: number;
		char: number;
	};
	closeBrace?: {
		line: number;
		char: number;
	};
	firstContentLine?: number;
	parentBlock?: ParsedBlock;
	docBlockStartLine?: number;
	docBlockEndLine?: number;
	isSingleLine?: boolean;
}

export interface ParsedClassStructure extends ParsedBlock {
	type: 'class' | 'interface' | 'trait';
	methods: ParsedMethodStructure[];
}

export interface ParsedMethodStructure extends ParsedBlock {
	type: 'method' | 'function';
	className?: string;
	isMethod: boolean;
}

export interface PHPFileAnalysis {
	classes: ParsedClassStructure[];
	functions: ParsedMethodStructure[];
	controls: ParsedBlock[];
	comments: Array<{ startLine: number; endLine: number; isDocBlock: boolean }>;
	blankLineIndices: Set<number>;
	allBlocks: ParsedBlock[];
	lineDepths?: number[];
}

export interface RuleContext {
	documentText: string;
	lines: string[];
	lineCount: number;
	settings: FormattingSettings;
	languageId: string;
	phpAnalysis?: PHPFileAnalysis;
}

export interface Rule {
	id: string;
	name: string;
	languages: string[];
	run(context: RuleContext): DiagnosticIssue[];
}
