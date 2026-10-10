import type * as vscode from 'vscode';
import { FormattingSettings } from './types';

let vscodeModule: typeof vscode | null = null;
try {
	vscodeModule = require('vscode');
} catch {
	vscodeModule = null;
}

export const DEFAULT_SETTINGS: FormattingSettings = {
	enable: true,
	validateOn: 'type',
	php: {
		openingBraceSameLine: true,
		controlStructureBraceSameLine: true,
		blankLineAfterClassBrace: 1,
		blankLineAfterMethodBrace: 1,
		blankLinesBetweenMethods: 2,
	},
	common: {
		indentType: 'tabs',
		noTrailingWhitespace: true,
		spaceBeforeOpeningBrace: true,
		emptyLineIndentation: 'tabs',
	},
};

export function getConfiguration(document?: vscode.TextDocument): FormattingSettings {
	try {
		if (!vscodeModule || !vscodeModule.workspace) {
			return DEFAULT_SETTINGS;
		}
		const scope = document ? document.uri : undefined;
		const config = vscodeModule.workspace.getConfiguration('nalemiValidFormatter', scope);

		return {
			enable: config.get<boolean>('enable', DEFAULT_SETTINGS.enable),
			validateOn: config.get<'type' | 'save'>('validateOn', DEFAULT_SETTINGS.validateOn),
			php: {
				openingBraceSameLine: config.get<boolean>(
					'php.openingBraceSameLine',
					DEFAULT_SETTINGS.php.openingBraceSameLine
				),
				controlStructureBraceSameLine: config.get<boolean>(
					'php.controlStructureBraceSameLine',
					DEFAULT_SETTINGS.php.controlStructureBraceSameLine
				),
				blankLineAfterClassBrace: config.get<number>(
					'php.blankLineAfterClassBrace',
					DEFAULT_SETTINGS.php.blankLineAfterClassBrace
				),
				blankLineAfterMethodBrace: config.get<number>(
					'php.blankLineAfterMethodBrace',
					DEFAULT_SETTINGS.php.blankLineAfterMethodBrace
				),
				blankLinesBetweenMethods: config.get<number>(
					'php.blankLinesBetweenMethods',
					DEFAULT_SETTINGS.php.blankLinesBetweenMethods
				),
			},
			common: {
				indentType: config.get<'tabs' | 'spaces' | 'off'>(
					'common.indentType',
					DEFAULT_SETTINGS.common.indentType
				),
				noTrailingWhitespace: config.get<boolean>(
					'common.noTrailingWhitespace',
					DEFAULT_SETTINGS.common.noTrailingWhitespace
				),
				spaceBeforeOpeningBrace: config.get<boolean>(
					'common.spaceBeforeOpeningBrace',
					DEFAULT_SETTINGS.common.spaceBeforeOpeningBrace
				),
				emptyLineIndentation: config.get<'tabs' | 'allow-empty-or-tabs' | 'empty' | 'off'>(
					'common.emptyLineIndentation',
					DEFAULT_SETTINGS.common.emptyLineIndentation
				),
			},
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}
