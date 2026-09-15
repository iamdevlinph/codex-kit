#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const KINDS = new Set(["major", "minor", "patch", "none"]);

function fail(message) {
	throw new Error(message);
}

export function parseVersion(value, label) {
	const match = SEMVER.exec(value);
	if (!match)
		fail(
			`${label} must be SemVer (major.minor.patch): ${JSON.stringify(value)}`,
		);
	return match.slice(1).map(Number);
}

export function bumpedVersion(version, kind) {
	const [major, minor, patch] = parseVersion(version, "version");
	return {
		none: `${major}.${minor}.${patch}`,
		major: `${major + 1}.0.0`,
		minor: `${major}.${minor + 1}.0`,
		patch: `${major}.${minor}.${patch + 1}`,
	}[kind];
}

function gitShow(revision, path) {
	try {
		return execFileSync("git", ["show", `${revision}:${path}`], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return undefined;
	}
}

function manifest(source, label) {
	let value;
	try {
		value = JSON.parse(source);
	} catch {
		fail(`${label} must be valid JSON`);
	}
	parseVersion(value.version, `${label} version`);
	return value;
}

function releaseNotes() {
	let value;
	try {
		value = readFileSync("RELEASE_NOTES.md", "utf8");
	} catch (error) {
		if (error?.code === "ENOENT") fail("RELEASE_NOTES.md is missing or empty");
		throw error;
	}
	if (!value.trim()) fail("RELEASE_NOTES.md is missing or empty");
	return value;
}

export function bump(kind) {
	if (!KINDS.has(kind)) fail("usage: release.mjs bump major|minor|patch|none");
	const baselineSource = gitShow("HEAD", "package.json");
	if (baselineSource === undefined) fail("HEAD:package.json is required");
	const baseline = manifest(baselineSource, "HEAD:package.json");
	const current = manifest(
		readFileSync("package.json", "utf8"),
		"package.json",
	);
	const desired = bumpedVersion(baseline.version, kind);
	if (![baseline.version, desired].includes(current.version))
		fail(
			`conflicting manual package.json version edit: HEAD is ${baseline.version}, working tree is ${current.version}`,
		);
	const notes = releaseNotes();
	if (
		kind !== "none" &&
		notes.trim() === gitShow("HEAD", "RELEASE_NOTES.md")?.trim()
	)
		fail("RELEASE_NOTES.md must change before a version bump");
	current.version = desired;
	writeFileSync("package.json", `${JSON.stringify(current, null, "\t")}\n`);
	return desired;
}

export function validateTag(tag, previousTag) {
	const current = manifest(
		readFileSync("package.json", "utf8"),
		"package.json",
	).version;
	if (tag !== `v${current}`)
		fail(`tag ${tag} does not match package.json version ${current}`);
	const notes = releaseNotes();
	const previousSource = gitShow(previousTag, "package.json");
	if (previousSource === undefined)
		fail(`cannot read package.json from ${previousTag}`);
	const previous = manifest(
		previousSource,
		`${previousTag}:package.json`,
	).version;
	if (
		!["major", "minor", "patch"].some(
			(kind) => bumpedVersion(previous, kind) === current,
		)
	)
		fail(`package.json must contain one SemVer increment after ${previous}`);
	if (notes.trim() === gitShow(previousTag, "RELEASE_NOTES.md")?.trim())
		fail("RELEASE_NOTES.md must change with package.json version");
	return current;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		const [, , command, first, second] = process.argv;
		let version;
		if (command === "bump") version = bump(first);
		else if (command === "validate-tag" && first && second)
			version = validateTag(first, second);
		else
			fail(
				"usage: release.mjs bump <kind> | validate-tag <tag> <previous-tag>",
			);
		console.log(version);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
