import * as vscode from 'vscode';
import { DiagnosticIssue } from './core/types';

export class ValidFormatterCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix,
		vscode.CodeActionKind.SourceFixAll,
	];

	private diagnosticsMap: Map<string, DiagnosticIssue[]> = new Map();

	public setDiagnostics(uri: string, issues: DiagnosticIssue[]): void {
		this.diagnosticsMap.set(uri, issues);
	}

	public clear(uri: string): void {
		this.diagnosticsMap.delete(uri);
	}

	public provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext
	): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];
		const fileIssues = this.diagnosticsMap.get(document.uri.toString()) || [];

		for (const diag of context.diagnostics) {
			if (!diag.code || typeof diag.code !== 'string' || !diag.code.startsWith('nalemi.')) {
				continue;
			}

			// Find matching issue
			const matchingIssue = fileIssues.find(
				(issue) =>
					issue.code === diag.code &&
					issue.range.startLine === diag.range.start.line &&
					issue.range.startChar === diag.range.start.character
			);

			if (matchingIssue && matchingIssue.fix) {
				const action = new vscode.CodeAction(
					matchingIssue.fix.title,
					vscode.CodeActionKind.QuickFix
				);
				action.diagnostics = [diag];
				action.isPreferred = true;
				action.edit = new vscode.WorkspaceEdit();

				for (const edit of matchingIssue.fix.edits) {
					action.edit.replace(
						document.uri,
						new vscode.Range(
							edit.startLine,
							edit.startChar,
							edit.endLine,
							edit.endChar
						),
						edit.newText
					);
				}

				actions.push(action);
			}
		}

		return actions;
	}
}
