import * as vscode from 'vscode';
import { RuleEngine } from './core/ruleEngine';
import { getConfiguration } from './core/config';
import { DiagnosticIssue, Severity } from './core/types';
import { ValidFormatterCodeActionProvider } from './codeActions';

let diagnosticCollection: vscode.DiagnosticCollection;
let ruleEngine: RuleEngine;
let codeActionProvider: ValidFormatterCodeActionProvider;
const debounceTimers = new Map<string, NodeJS.Timeout>();

export function activate(context: vscode.ExtensionContext) {
	ruleEngine = new RuleEngine();
	diagnosticCollection = vscode.languages.createDiagnosticCollection('nalemi-valid-formatter');
	codeActionProvider = new ValidFormatterCodeActionProvider();

	context.subscriptions.push(diagnosticCollection);

	// Register Code Action Provider for PHP
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ language: 'php', scheme: 'file' },
			codeActionProvider,
			{
				providedCodeActionKinds: ValidFormatterCodeActionProvider.providedCodeActionKinds,
			}
		)
	);

	// Helper to run validation
	function validateDoc(document: vscode.TextDocument) {
		if (document.languageId !== 'php') {
			return;
		}

		const settings = getConfiguration(document);
		if (!settings.enable) {
			diagnosticCollection.delete(document.uri);
			codeActionProvider.clear(document.uri.toString());
			return;
		}

		const issues = ruleEngine.validate(
			document.getText(),
			document.languageId,
			settings
		);

		const diagnostics: vscode.Diagnostic[] = issues.map((issue) => {
			const range = new vscode.Range(
				issue.range.startLine,
				issue.range.startChar,
				issue.range.endLine,
				issue.range.endChar
			);

			let vscodeSeverity = vscode.DiagnosticSeverity.Warning;
			if (issue.severity === 'error') {
				vscodeSeverity = vscode.DiagnosticSeverity.Error;
			} else if (issue.severity === 'info') {
				vscodeSeverity = vscode.DiagnosticSeverity.Information;
			}

			const diag = new vscode.Diagnostic(range, issue.message, vscodeSeverity);
			diag.code = issue.code;
			diag.source = 'Nalemi Formatter';
			return diag;
		});

		diagnosticCollection.set(document.uri, diagnostics);
		codeActionProvider.setDiagnostics(document.uri.toString(), issues);
	}

	function triggerValidation(document: vscode.TextDocument, immediate = false) {
		if (document.languageId !== 'php') return;

		const uriStr = document.uri.toString();
		const existingTimer = debounceTimers.get(uriStr);
		if (existingTimer) {
			clearTimeout(existingTimer);
			debounceTimers.delete(uriStr);
		}

		if (immediate) {
			validateDoc(document);
		} else {
			const timer = setTimeout(() => {
				validateDoc(document);
				debounceTimers.delete(uriStr);
			}, 250);
			debounceTimers.set(uriStr, timer);
		}
	}

	// Document listeners
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((doc) => {
			triggerValidation(doc, true);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((e) => {
			const settings = getConfiguration(e.document);
			if (settings.validateOn === 'type') {
				triggerValidation(e.document, false);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((doc) => {
			triggerValidation(doc, true);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => {
			diagnosticCollection.delete(doc.uri);
			codeActionProvider.clear(doc.uri.toString());
			const uriStr = doc.uri.toString();
			const timer = debounceTimers.get(uriStr);
			if (timer) {
				clearTimeout(timer);
				debounceTimers.delete(uriStr);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('nalemiValidFormatter')) {
				for (const doc of vscode.workspace.textDocuments) {
					triggerValidation(doc, true);
				}
			}
		})
	);

	// Command: Validate active document
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'nalemiValidFormatter.validateActiveDocument',
			() => {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor) {
					validateDoc(activeEditor.document);
					vscode.window.showInformationMessage(
						'Nalemi Formatter: Kontrola dokumentu dokončena.'
					);
				}
			}
		)
	);

	// Command: Fix all whitespace issues in active document
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'nalemiValidFormatter.fixAllWhitespace',
			async () => {
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor || activeEditor.document.languageId !== 'php') {
					return;
				}

				const doc = activeEditor.document;
				const settings = getConfiguration(doc);
				const issues = ruleEngine.validate(doc.getText(), doc.languageId, settings);

				const fixableIssues = issues.filter((i) => i.fix && i.fix.edits.length > 0);
				if (fixableIssues.length === 0) {
					vscode.window.showInformationMessage(
						'Nalemi Formatter: Všechny formátovací kontroly jsou v pořádku.'
					);
					return;
				}

				// Apply fixes in reverse order of lines to avoid range shifting
				const allEdits = fixableIssues.flatMap((i) => i.fix!.edits);
				allEdits.sort((a, b) => {
					if (b.startLine !== a.startLine) {
						return b.startLine - a.startLine;
					}
					return b.startChar - a.startChar;
				});

				const edit = new vscode.WorkspaceEdit();
				for (const op of allEdits) {
					edit.replace(
						doc.uri,
						new vscode.Range(op.startLine, op.startChar, op.endLine, op.endChar),
						op.newText
					);
				}

				await vscode.workspace.applyEdit(edit);
				validateDoc(doc);
				vscode.window.showInformationMessage(
					`Nalemi Formatter: Aplikováno ${allEdits.length} oprav formátování.`
				);
			}
		)
	);

	// Validate all currently open documents on activation
	for (const doc of vscode.workspace.textDocuments) {
		triggerValidation(doc, true);
	}
}

export function deactivate() {
	if (diagnosticCollection) {
		diagnosticCollection.clear();
		diagnosticCollection.dispose();
	}
	for (const timer of debounceTimers.values()) {
		clearTimeout(timer);
	}
	debounceTimers.clear();
}
