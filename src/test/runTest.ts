import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RuleEngine } from '../core/ruleEngine';
import { DEFAULT_SETTINGS } from '../core/config';
import { FormattingSettings } from '../core/types';

describe('Nalemi Valid Formatter Rules Test Suite', () => {
	const engine = new RuleEngine();

	const testSettings: FormattingSettings = {
		...DEFAULT_SETTINGS,
		enable: true,
	};

	it('Rule: Class brace on same line vs next line', () => {
		const badCode = `<?php
class BadClass
{

\tpublic function test() {

\t}
}
`;
		const issuesBad = engine.validate(badCode, 'php', testSettings);
		const braceIssues = issuesBad.filter((i) => i.code === 'nalemi.php.class-brace-same-line');
		assert.strictEqual(braceIssues.length, 1);
		assert.ok(braceIssues[0].message.includes('BadClass'));

		const goodCode = `<?php
class GoodClass {

\tpublic function test() {

\t}
}
`;
		const issuesGood = engine.validate(goodCode, 'php', testSettings);
		const braceIssuesGood = issuesGood.filter((i) => i.code === 'nalemi.php.class-brace-same-line');
		assert.strictEqual(braceIssuesGood.length, 0);
	});

	it('Rule: Method brace on same line vs next line', () => {
		const badCode = `<?php
class MyClass {

\tpublic function badMethod()
\t{

\t\treturn true;
\t}
}
`;
		const issuesBad = engine.validate(badCode, 'php', testSettings);
		const methodBraceIssues = issuesBad.filter((i) => i.code === 'nalemi.php.method-brace-same-line');
		assert.strictEqual(methodBraceIssues.length, 1);
		assert.ok(methodBraceIssues[0].message.includes('badMethod'));

		const goodCode = `<?php
class MyClass {

\tpublic function goodMethod() {

\t\treturn true;
\t}
}
`;
		const issuesGood = engine.validate(goodCode, 'php', testSettings);
		const methodBraceIssuesGood = issuesGood.filter((i) => i.code === 'nalemi.php.method-brace-same-line');
		assert.strictEqual(methodBraceIssuesGood.length, 0);
	});

	it('Rule: Control structure (if) opening brace on same line', () => {
		const badCode = `<?php
class TestClass {

\tpublic function check($x) {

\t\tif ($x > 0)
\t\t{
\t\t\treturn 1;
\t\t}
\t}
}
`;
		const issues = engine.validate(badCode, 'php', testSettings);
		const controlIssues = issues.filter((i) => i.code === 'nalemi.php.control-brace-same-line');
		assert.strictEqual(controlIssues.length, 1);
		assert.ok(controlIssues[0].message.includes('if'));
	});

	it('Rule: Blank line after class and method opening brace', () => {
		// Bad: no empty line after class brace and no empty line after multi-line method brace
		const noBlankCode = `<?php
class NoBlankClass {
\tpublic function multiLineMethod() {
\t\t$a = 1;
\t\t$b = 2;
\t}
}
`;
		const issuesBad = engine.validate(noBlankCode, 'php', testSettings);
		const classBlankIssues = issuesBad.filter((i) => i.code === 'nalemi.php.blank-line-after-brace.class');
		const methodBlankIssues = issuesBad.filter((i) => i.code === 'nalemi.php.blank-line-after-brace.method');
		assert.strictEqual(classBlankIssues.length, 1);
		assert.strictEqual(methodBlankIssues.length, 1);

		// Good: single-line method WITHOUT blank line is now allowed!
		const singleLineNoBlank = `<?php
class ValidSingleLineClass {

\tpublic function make(string $class): mixed {
\t\treturn $this->resolve($class);
\t}
}
`;
		const issuesSingleNoBlank = engine.validate(singleLineNoBlank, 'php', testSettings);
		const singleMethodIssues = issuesSingleNoBlank.filter((i) => i.code === 'nalemi.php.blank-line-after-brace.method');
		assert.strictEqual(singleMethodIssues.length, 0, 'Single-line method should not require a blank line');

		// Good: single-line method WITH 1 blank line is ALSO allowed!
		const singleLineWithBlank = `<?php
class ValidSingleLineClass {

\tpublic function make(string $class): mixed {

\t\treturn $this->resolve($class);
\t}
}
`;
		const issuesSingleWithBlank = engine.validate(singleLineWithBlank, 'php', testSettings);
		const singleMethodWithBlankIssues = issuesSingleWithBlank.filter((i) => i.code === 'nalemi.php.blank-line-after-brace.method');
		assert.strictEqual(singleMethodWithBlankIssues.length, 0, 'Single-line method with 1 blank line should also be valid');

		// Bad: single-line method with 2 or more blank lines -> error
		const singleLineTooManyBlanks = `<?php
class ValidSingleLineClass {

\tpublic function make(string $class): mixed {



\t\treturn $this->resolve($class);
\t}
}
`;
		const issuesTooMany = engine.validate(singleLineTooManyBlanks, 'php', testSettings);
		const tooManyIssues = issuesTooMany.filter((i) => i.code === 'nalemi.php.blank-line-after-brace.method');
		assert.strictEqual(tooManyIssues.length, 1, 'Should report too many blank lines (>1)');
	});

	it('Rule: Two blank lines between methods', () => {
		// Only 1 blank line between method1 and method2 -> should report error
		const oneBlankBetween = `<?php
class CalcHelper {

\tpublic function methodOne() {

\t\treturn 1;
\t}

\tpublic function methodTwo() {

\t\treturn 2;
\t}
}
`;
		const issuesOne = engine.validate(oneBlankBetween, 'php', testSettings);
		const methodGapIssuesOne = issuesOne.filter((i) => i.code === 'nalemi.php.blank-lines-between-methods');
		assert.strictEqual(methodGapIssuesOne.length, 1);
		assert.ok(methodGapIssuesOne[0].message.includes('právě 2 prázdné řádky'));

		// 0 blank lines between methods -> should report error
		const zeroBlankBetween = `<?php
class CalcHelper {

\tpublic function methodOne() {

\t\treturn 1;
\t}
\tpublic function methodTwo() {

\t\treturn 2;
\t}
}
`;
		const issuesZero = engine.validate(zeroBlankBetween, 'php', testSettings);
		const methodGapIssuesZero = issuesZero.filter((i) => i.code === 'nalemi.php.blank-lines-between-methods');
		assert.strictEqual(methodGapIssuesZero.length, 1);

		// Exactly 2 blank lines between methodOne and methodTwo -> valid!
		const twoBlanksBetween = `<?php
class CalcHelper {

\tpublic function methodOne() {

\t\treturn 1;
\t}


\tpublic function methodTwo() {

\t\treturn 2;
\t}
}
`;
		const issuesTwo = engine.validate(twoBlanksBetween, 'php', testSettings);
		const methodGapIssuesTwo = issuesTwo.filter((i) => i.code === 'nalemi.php.blank-lines-between-methods');
		assert.strictEqual(methodGapIssuesTwo.length, 0);
	});

	it('Rule: Two blank lines between methods with DocBlock', () => {
		const codeWithDocBlock = `<?php
class Helper {

\tpublic function firstMethod() {

\t\treturn 1;
\t}


\t/**
\t * Popis metody
\t */
\tpublic function secondMethod() {

\t\treturn 2;
\t}
}
`;
		const issues = engine.validate(codeWithDocBlock, 'php', testSettings);
		const methodGapIssues = issues.filter((i) => i.code === 'nalemi.php.blank-lines-between-methods');
		assert.strictEqual(methodGapIssues.length, 0, 'Should accept 2 blank lines before DocBlock');

		// Bad: only 1 blank line before DocBlock
		const badDocBlock = `<?php
class Helper {

\tpublic function firstMethod() {

\t\treturn 1;
\t}

\t/**
\t * Popis metody
\t */
\tpublic function secondMethod() {

\t\treturn 2;
\t}
}
`;
		const badIssues = engine.validate(badDocBlock, 'php', testSettings);
		const badGapIssues = badIssues.filter((i) => i.code === 'nalemi.php.blank-lines-between-methods');
		assert.strictEqual(badGapIssues.length, 1, 'Should report error when only 1 blank line before DocBlock');
	});

	it('Rule: Multi-line function signature with brace on same line as closing parenthesis', () => {
		const multilineSignature = `<?php
class CarHelper {

\tpublic static function getStartTimeLastIntervalOfPublic(
\t\tint $clanek_ixp
\t): ?int {

\t\tif ($condition) {
\t\t\treturn 1;
\t\t}
\t}
}
`;
		const issues = engine.validate(multilineSignature, 'php', testSettings);
		const methodBraceIssues = issues.filter((i) => i.code === 'nalemi.php.method-brace-same-line');
		assert.strictEqual(methodBraceIssues.length, 0, 'Opening brace on the line where closing paren/return type is should pass');
	});

	it('Rule: Validate sample-test.php for clean and erroneous classes', () => {
		const fs = require('node:fs');
		const path = require('node:path');
		const sampleCode = fs.readFileSync(path.join(__dirname, '..', 'sample-test.php'), 'utf8');

		const issues = engine.validate(sampleCode, 'php', testSettings);

		// CorrectCarHelper should have 0 issues
		const issuesInCorrect = issues.filter(
			(i) => i.range.startLine >= 10 && i.range.startLine <= 26
		);
		assert.strictEqual(
			issuesInCorrect.length,
			0,
			`Expected 0 issues in CorrectCarHelper, found: ${JSON.stringify(issuesInCorrect)}`
		);

		// IncorrectCarHelper should have issues
		const issuesInIncorrect = issues.filter((i) => i.range.startLine >= 35);
		assert.ok(
			issuesInIncorrect.some((i) => i.code === 'nalemi.php.class-brace-same-line'),
			'Should flag IncorrectCarHelper class brace'
		);
		assert.ok(
			issuesInIncorrect.some((i) => i.code === 'nalemi.php.method-brace-same-line'),
			'Should flag firstMethod brace'
		);
		assert.ok(
			issuesInIncorrect.some((i) => i.code === 'nalemi.php.control-brace-same-line'),
			'Should flag if statement brace'
		);
		assert.ok(
			issuesInIncorrect.some((i) => i.code === 'nalemi.php.blank-lines-between-methods'),
			'Should flag missing second blank line between methods'
		);
	});

	it('Rule: Validate Container.php formatted code with allow-empty-or-tabs', () => {
		const containerCode = `<?php

declare(strict_types=1);

namespace Core;

final class Container {

\t/** @var array<string, callable|object> */
\tprivate array $bindings = [];

\t/** @var array<string, callable|object> */
\tprivate array $singletons = [];

\t/** @var array<string, mixed> */
\tprivate array $instances = [];


\tpublic function bind(string $abstract, callable|object $concrete): void {

\t\t$this->bindings[$abstract] = $concrete;
\t}


\tpublic function singleton(string $abstract, callable|object $concrete): void {
\t\t$this->singletons[$abstract] = $concrete;
\t}


\tpublic function make(string $class): mixed {

\t\treturn $this->resolve($class);
\t}
}
`;
		const settingsAllow = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'allow-empty-or-tabs' as const,
			},
		};
		const issues = engine.validate(containerCode, 'php', settingsAllow);
		assert.strictEqual(
			issues.length,
			0,
			`Container.php should have 0 issues, but found: ${JSON.stringify(issues, null, 2)}`
		);
	});

	it('Rule: Empty line tab indentation level (1 tab in class, 2 tabs in method, 3+ in nested ifs)', () => {
		// Code with perfect tab indentation on blank lines:
		// class body: \t
		// method body: \t\t
		// if body: \t\t\t
		const tabsCode = [
			'<?php',
			'class TabLevelClass {',
			'\t',
			'\tpublic function calc($x) {',
			'\t\t',
			'\t\t$a = 1;',
			'\t\tif ($x > 0) {',
			'\t\t\t',
			'\t\t\treturn $x;',
			'\t\t}',
			'\t\treturn $a;',
			'\t}',
			'}',
		].join('\n');

		const settingsTabs = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'tabs' as const,
			},
		};

		const issuesGood = engine.validate(tabsCode, 'php', settingsTabs);
		const tabIssues = issuesGood.filter((i) => i.code.startsWith('nalemi.common.empty-line'));
		const trailingIssues = issuesGood.filter((i) => i.code === 'nalemi.common.trailing-whitespace');

		assert.strictEqual(tabIssues.length, 0, 'Should accept proper tabs on blank lines');
		assert.strictEqual(trailingIssues.length, 0, 'Tabs on blank lines must NOT be treated as trailing whitespace');

		// Code with wrong tab count on blank line (e.g. 1 tab inside method where 2 are expected):
		const badTabsCode = [
			'<?php',
			'class TabLevelClass {',
			'\t',
			'\tpublic function calc($x) {',
			'\t', // wrong! only 1 tab instead of 2
			'\t\t$a = 1;',
			'\t\treturn $a;',
			'\t}',
			'}',
		].join('\n');

		const issuesBad = engine.validate(badTabsCode, 'php', settingsTabs);
		const badTabIssues = issuesBad.filter((i) => i.code === 'nalemi.common.empty-line-indent');
		assert.strictEqual(badTabIssues.length, 1);
		assert.ok(badTabIssues[0].message.includes('2 tabulátory'));

		// Code with spaces on blank line
		const spacesBlankCode = [
			'<?php',
			'class TabLevelClass {',
			'  ', // wrong! spaces instead of tab
			'\tpublic function calc($x) {',
			'\t\treturn $x;',
			'\t}',
			'}',
		].join('\n');

		const issuesSpaces = engine.validate(spacesBlankCode, 'php', settingsTabs);
		const spaceIssues = issuesSpaces.filter((i) => i.code === 'nalemi.common.empty-line-spaces');
		assert.strictEqual(spaceIssues.length, 1);
	});

	it('Rule: Trailing whitespace and tabs indentation', () => {
		const codeWithTrailingAndSpaces = `<?php
class SpacesClass {

    public function testSpaces() { 

\t\treturn 42;
\t}
}
`;
		const issues = engine.validate(codeWithTrailingAndSpaces, 'php', testSettings);
		const trailingIssues = issues.filter((i) => i.code === 'nalemi.common.trailing-whitespace');
		const spaceIndentIssues = issues.filter((i) => i.code === 'nalemi.common.indent-tabs');

		assert.ok(trailingIssues.length >= 1, 'Should detect trailing whitespace');
		assert.ok(spaceIndentIssues.length >= 1, 'Should detect space indentation when tabs expected');
	});

	it('Mixed PHP/HTML: Proper nesting depth when HTML parent indents nested PHP and vice versa', () => {
		const mixedTemplate = [
			'<div class="container">',
			'\t<div class="row">',
			'\t\t',
			'\t\t<?php if ($show): ?>',
			'\t\t\t<div class="col">',
			'\t\t\t\t',
			'\t\t\t\t<p>Hello</p>',
			'\t\t\t</div>',
			'\t\t<?php endif; ?>',
			'\t</div>',
			'</div>',
		].join('\n');

		const settingsTabs = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'tabs' as const,
			},
		};

		const issues = engine.validate(mixedTemplate, 'php', settingsTabs);
		const emptyLineIssues = issues.filter((i) => i.code.startsWith('nalemi.common.empty-line'));
		assert.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues, found: ${JSON.stringify(emptyLineIssues)}`);
	});

	it('Mixed PHP/HTML: Detect wrong tab count on empty lines in nested HTML and PHP', () => {
		const badMixedTemplate = [
			'<div class="container">',
			'\t<div class="row">',
			'\t', // wrong! should be 2 tabs
			'\t\t<?php if ($show): ?>',
			'\t\t\t<div class="col">',
			'\t\t', // wrong! should be 4 tabs
			'\t\t\t\t<p>Hello</p>',
			'\t\t\t</div>',
			'\t\t<?php endif; ?>',
			'\t</div>',
			'</div>',
		].join('\n');

		const settingsTabs = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'tabs' as const,
			},
		};

		const issues = engine.validate(badMixedTemplate, 'php', settingsTabs);
		const emptyLineIssues = issues.filter((i) => i.code === 'nalemi.common.empty-line-indent');
		assert.strictEqual(emptyLineIssues.length, 2);
		assert.ok(emptyLineIssues[0].message.includes('2 tabulátory'));
		assert.ok(emptyLineIssues[1].message.includes('4 tabulátory'));
	});

	it('Mixed PHP/HTML: HTML class="..." and <script> function are not treated as PHP declarations', () => {
		const htmlWithClassesAndScript = [
			'<?php',
			'$title = "Test";',
			'?>',
			'<div class="btn btn-primary">',
			'\t<span class="badge">Badge</span>',
			'</div>',
			'<script>',
			'\tfunction jsFunction() {',
			'\t\tconsole.log("ok");',
			'\t}',
			'</script>',
		].join('\n');

		const issues = engine.validate(htmlWithClassesAndScript, 'php', testSettings);
		const classIssues = issues.filter((i) => i.code.includes('class-brace'));
		const methodIssues = issues.filter((i) => i.code.includes('method-brace') || i.code.includes('blank-line-after-brace'));
		assert.strictEqual(classIssues.length, 0, 'HTML class attributes must not trigger PHP class brace rules');
		assert.strictEqual(methodIssues.length, 0, 'JS functions in script tags must not trigger PHP method rules');
	});

	it('Mixed PHP/HTML: PHP method containing HTML markup inherits proper indentation', () => {
		const phpWithHtmlInside = [
			'<?php',
			'class CarView {',
			'\t',
			'\tpublic function render() {',
			'\t\t?>',
			'\t\t<div class="car">',
			'\t\t\t<p>Car details</p>',
			'\t\t\t',
			'\t\t</div>',
			'\t\t<?php',
			'\t}',
			'}',
		].join('\n');

		const settingsTabs = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'tabs' as const,
			},
		};

		const issues = engine.validate(phpWithHtmlInside, 'php', settingsTabs);
		const emptyLineIssues = issues.filter((i) => i.code.startsWith('nalemi.common.empty-line'));
		assert.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues in PHP with HTML, found: ${JSON.stringify(emptyLineIssues)}`);
	});

	it('Mixed PHP/HTML: Alternative syntax if, elseif, else branches with correct tabs on empty lines', () => {
		const altSyntaxTemplate = [
			'<?php if ($type === 1): ?>',
			'\t<p>Type 1</p>',
			'\t',
			'<?php elseif ($type === 2): ?>',
			'\t<p>Type 2</p>',
			'\t',
			'<?php else: ?>',
			'\t<p>Other</p>',
			'\t',
			'<?php endif; ?>',
		].join('\n');

		const settingsTabs = {
			...testSettings,
			common: {
				...testSettings.common,
				emptyLineIndentation: 'tabs' as const,
			},
		};

		const issues = engine.validate(altSyntaxTemplate, 'php', settingsTabs);
		const emptyLineIssues = issues.filter((i) => i.code.startsWith('nalemi.common.empty-line'));
		assert.strictEqual(emptyLineIssues.length, 0, `Expected 0 empty line issues in alternative syntax, found: ${JSON.stringify(emptyLineIssues)}`);
	});
});
