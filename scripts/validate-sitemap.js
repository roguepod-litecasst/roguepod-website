/**
 * Fails the build on a bad sitemap.
 *
 * Runs straight after generate-sitemap.js in `npm run build`, which is the only
 * path to a deploy, so nothing reaches roguepod.show without passing here.
 *
 * The failure mode this exists for is silence: a sitemap that quietly loses
 * pages, or emits a <url> with no <loc>, still deploys and still looks fine in
 * the repo. Google is the one that notices, months later.
 *
 * Checks, in order of how much damage each catches:
 *   - the XML prolog and the 0.9 namespace, without which Google rejects the
 *     file outright rather than the offending entry;
 *   - every <url> has exactly one non-empty <loc>;
 *   - every <loc> is absolute, https, roguepod.show, no www, trailing slash —
 *     the form GitHub Pages answers 200 for (see generate-sitemap.js);
 *   - no duplicate URLs, no future-dated or malformed lastmod;
 *   - the URL count against the last committed sitemap: >10% fewer is an
 *     error, any drop at all is at least a warning;
 *   - the vendored sitemaps.org 0.9 XSD, when xmllint is on the box. It's
 *     present on GitHub's ubuntu runners; a dev machine without it gets a note,
 *     not a failure, since the structural checks above already cover this
 *     file's shape.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SITEMAP = path.join(REPO_ROOT, 'public/sitemap.xml');
const SCHEMA = path.join(__dirname, 'sitemap-0.9.xsd');
const SITE_ORIGIN = 'https://roguepod.show';
const DROP_TOLERANCE = 0.1;

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const countUrls = (xml) => (xml.match(/<url>/g) || []).length;

function checkStructure(xml) {
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    fail('Missing or malformed XML declaration on line 1.');
  }
  if (!/<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"\s*>/.test(xml)) {
    fail('Missing the sitemaps.org 0.9 xmlns on <urlset>.');
  }
  if (!xml.includes('</urlset>')) fail('Unclosed <urlset>.');

  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const openTags = countUrls(xml);
  if (blocks.length !== openTags) {
    fail(`${openTags} <url> opening tags but ${blocks.length} complete <url> elements.`);
  }
  if (blocks.length === 0) fail('Sitemap contains no <url> entries.');

  const seen = new Set();
  blocks.forEach((block, index) => {
    const position = `entry ${index + 1}`;
    const locs = block.match(/<loc>([\s\S]*?)<\/loc>/g) || [];

    if (locs.length === 0) {
      fail(`${position}: <url> has no <loc> — invalid against the 0.9 schema.`);
      return;
    }
    if (locs.length > 1) fail(`${position}: <url> has ${locs.length} <loc> children, expected 1.`);

    const loc = locs[0].replace(/<\/?loc>/g, '').trim();
    if (!loc) {
      fail(`${position}: <loc> is empty.`);
      return;
    }
    if (!loc.startsWith(`${SITE_ORIGIN}/`)) {
      fail(`${position}: <loc> is not an absolute ${SITE_ORIGIN} URL: ${loc}`);
    }
    if (loc.includes('//www.')) fail(`${position}: <loc> uses the www host: ${loc}`);
    if (!loc.endsWith('/')) {
      fail(
        `${position}: <loc> has no trailing slash: ${loc}\n` +
          '    GitHub Pages 301s the bare path to the slashed one, and Google ' +
          'counts a redirecting sitemap URL as an error.'
      );
    }
    if (seen.has(loc)) fail(`${position}: duplicate <loc>: ${loc}`);
    seen.add(loc);

    const lastmod = (block.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1];
    if (lastmod !== undefined) {
      const value = lastmod.trim();
      if (!/^\d{4}-\d{2}-\d{2}(T[\d:.+\-Z]+)?$/.test(value)) {
        fail(`${position}: lastmod "${value}" is not a W3C datetime.`);
      } else if (value.slice(0, 10) > new Date().toISOString().slice(0, 10)) {
        fail(`${position}: lastmod "${value}" is in the future.`);
      }
    }
  });

  return blocks.length;
}

/** The last committed sitemap, or null when there's nothing to compare against. */
function previousCount() {
  try {
    const previous = execFileSync('git', ['show', 'HEAD:public/sitemap.xml'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return countUrls(previous);
  } catch {
    return null;
  }
}

function checkAgainstSchema() {
  try {
    execFileSync('xmllint', ['--noout', '--schema', SCHEMA, SITEMAP], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return 'valid against the sitemaps.org 0.9 schema';
  } catch (error) {
    if (error.code === 'ENOENT') return 'xmllint not installed — schema check skipped';
    const detail = (error.stderr || '').toString().trim() || error.message;
    fail(`Schema validation failed:\n${detail}`);
    return 'schema check FAILED';
  }
}

function main() {
  if (!fs.existsSync(SITEMAP)) {
    console.error('✗ No public/sitemap.xml — run generate-sitemap.js first.');
    process.exit(1);
  }

  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const count = checkStructure(xml);
  const schemaResult = checkAgainstSchema();

  const before = previousCount();
  if (before !== null && count < before) {
    const dropped = before - count;
    const share = dropped / before;
    const summary = `URL count fell from ${before} to ${count} (-${dropped}).`;
    if (share > DROP_TOLERANCE) {
      fail(
        `${summary} That's more than ${DROP_TOLERANCE * 100}% — if it's intentional, ` +
          'commit the new sitemap first so it becomes the baseline.'
      );
    } else {
      warn(summary);
    }
  }

  warnings.forEach((message) => console.warn(`⚠ ${message}`));

  if (errors.length > 0) {
    console.error(`\n✗ Sitemap validation failed (${errors.length} problem(s)):`);
    errors.forEach((message) => console.error(`  - ${message}`));
    process.exit(1);
  }

  const delta = before === null ? '' : `, was ${before}`;
  console.log(`✓ Sitemap valid: ${count} URLs${delta} — ${schemaResult}`);
}

main();
