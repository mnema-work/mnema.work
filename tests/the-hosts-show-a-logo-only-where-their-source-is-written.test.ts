// @reads-the-tree
/**
 * A HOST HAS A LOGO ON THE HOME PAGE ONLY WHERE THE VENDOR'S OWN FILE AND ITS RULE OF USE ARE WRITTEN DOWN. Every host of the
 * product README's table is shown, and shown either by a logo that `hosts/SOURCES.md` lists (the file, the host, where it was
 * fetched, the day, the sha256 of the file) or by its name. A host that is new in the README is in no list here, so it is shown
 * by its name until someone reads its vendor's guidelines and adds the file with its source.
 *
 *   - NO FILE OF `hosts/` WITHOUT A ROW, NO LOGO WITHOUT A FILE THE ROW HASHES: read over the real folder and over fixtures.
 *   - THE PAGE: each host that has a logo has it unmodified (the file served is the file tracked), linked where the vendor's rule
 *     says, beside the host's name; each other host has its name and no picture; no other picture is on the page.
 *   - THE MARKS: the footer names the owner of each logo the page shows.
 *
 * WHAT IT DOES NOT CHECK: that a vendor's guidelines still say what the row quotes (a person reads the page again).
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { faultsAgainstProduct, faultsOf, HOSTS_DIR, LOGOS, PRODUCT_HOSTS_DIR, productHasHosts, rowsOf, sha256, SOURCES, withLogos } from '../build/the-hosts.mjs';
import { hostsOf } from '../build/the-home.mjs';
import { DIST, ROOT, readText, SITE } from './support/reading-the-site.js';

const sources = (): string => readText(join(SITE, SOURCES));
const BUILT = existsSync(join(DIST, 'index.html'));
const when = BUILT ? describe : describe.skip;

describe('the sources of the logos, over fixtures', () => {
  const fixture = (files: Record<string, string>, table: string): { dir: string; done: () => void } => {
    const dir = mkdtempSync(join(tmpdir(), 'the-hosts-'));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    writeFileSync(join(dir, 'SOURCES.md'), table);
    return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
  };
  const logos = { Alpha: { file: 'alpha.svg', href: 'https://alpha.example', alt: 'Alpha', width: 10, height: 10, owner: 'Alpha Inc.' } };
  const row = (file: string, host: string, hash: string): string => `| \`${file}\` | ${host} | https://alpha.example/${file} | 2026-11-09 | \`${hash}\` |`;

  it('has no fault for a logo whose file is there and whose row hashes it', () => {
    const { dir, done } = fixture({ 'alpha.svg': 'x' }, row('alpha.svg', 'Alpha', sha256('x')));
    try {
      expect(faultsOf({ logos, dir, sources: readFileSync(join(dir, 'SOURCES.md'), 'utf8') })).toEqual([]);
    } finally {
      done();
    }
  });

  it('names a logo with no row, a file that is not the one the row hashes, a file with no row and a file that is missing', () => {
    const { dir, done } = fixture({ 'alpha.svg': 'x', 'stray.svg': 'y' }, row('other.svg', 'Alpha', sha256('x')));
    try {
      const faults = faultsOf({ logos, dir, sources: readFileSync(join(dir, 'SOURCES.md'), 'utf8') });
      expect(faults.join('\n')).toMatch(/Alpha: SOURCES\.md has no row|has no row for alpha\.svg/);
      expect(faults.join('\n')).toMatch(/hosts\/stray\.svg has no row/);
    } finally {
      done();
    }
    const changed = fixture({ 'alpha.svg': 'x' }, row('alpha.svg', 'Alpha', sha256('not x')));
    try {
      expect(faultsOf({ logos, dir: changed.dir, sources: readFileSync(join(changed.dir, 'SOURCES.md'), 'utf8') }).join('\n')).toMatch(/is not the file/);
    } finally {
      changed.done();
    }
    const missing = fixture({}, row('alpha.svg', 'Alpha', sha256('x')));
    try {
      expect(faultsOf({ logos, dir: missing.dir, sources: readFileSync(join(missing.dir, 'SOURCES.md'), 'utf8') }).join('\n')).toMatch(/is not in hosts\//);
    } finally {
      missing.done();
    }
  });

  it('stops the build at a logo that has no source, and shows a host that has none by its name', () => {
    const { dir, done } = fixture({ 'alpha.svg': 'x' }, 'no table here\n');
    try {
      expect(() => withLogos([{ name: 'Alpha', rung: 'a' }], { logos, dir })).toThrow(/has no source/);
    } finally {
      done();
    }
    const ok = fixture({ 'alpha.svg': 'x' }, row('alpha.svg', 'Alpha', sha256('x')));
    try {
      const shown = withLogos([{ name: 'Alpha', rung: 'a' }, { name: 'Beta', rung: 'b' }], { logos, dir: ok.dir }) as { name: string; logo?: { src: string } }[];
      expect(shown[0]?.logo?.src).toBe('/hosts/alpha.svg');
      expect(shown[1], 'a host the README has and no list names').toEqual({ name: 'Beta', rung: 'b' });
      expect(() => withLogos([{ name: 'Beta', rung: 'b' }], { logos, dir: ok.dir })).toThrow(/not a host of the README/);
    } finally {
      ok.done();
    }
  });
});

describe('the logos this repository holds, against the product it is built from', () => {
  it('are the product\'s own files of the checkout being built, byte for byte, with the hashes its SOURCES.md gives', () => {
    expect(faultsAgainstProduct({ root: ROOT, sources: sources() })).toEqual([]);
  });

  const checkout = (version: string, hosts?: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), 'the-product-'));
    mkdirSync(join(root, 'packages/code'), { recursive: true });
    writeFileSync(join(root, 'packages/code/package.json'), JSON.stringify({ version }));
    if (hosts !== undefined) {
      mkdirSync(join(root, PRODUCT_HOSTS_DIR), { recursive: true });
      for (const [name, text] of Object.entries(hosts)) writeFileSync(join(root, PRODUCT_HOSTS_DIR, name), text);
    }
    return root;
  };
  const alpha = (dir: string, text = 'x'): void => {
    writeFileSync(join(dir, 'alpha.svg'), text);
    writeFileSync(join(dir, 'SOURCES.md'), `| \`alpha.svg\` | Alpha | https://alpha.example | 2026-11-09 | \`${sha256('x')}\` |\n`);
  };
  const shown = [{ name: 'Alpha', rung: 'a' }];
  const logos = { Alpha: { file: 'alpha.svg', href: 'https://alpha.example', alt: '', width: 10, height: 10, owner: 'Alpha Inc.' } };

  it('is skipped, with a line said, only for a checkout of a version below 0.1.8 that has no assets/hosts, and the site\'s own table still holds', () => {
    const product = checkout('0.1.7');
    const dir = mkdtempSync(join(tmpdir(), 'the-site-'));
    const lines: unknown[][] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((...a) => void lines.push(a));
    try {
      alpha(dir);
      expect(productHasHosts(product)).toBe(false);
      expect(faultsAgainstProduct({ root: product, dir, sources: readFileSync(join(dir, 'SOURCES.md'), 'utf8') })).toEqual([]);
      expect(withLogos(shown, { logos, dir, root: product })[0]?.logo?.file).toBe('alpha.svg');
      expect(lines.join('\n')).toMatch(/not compared with the product's assets\/hosts\/: this tag predates it/);
      writeFileSync(join(dir, 'alpha.svg'), 'changed');
      expect(() => withLogos(shown, { logos, dir, root: product })).toThrow(/is not the file/);
    } finally {
      log.mockRestore();
      rmSync(product, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a checkout of 0.1.8 or later that has no assets/hosts, whatever the version looks like', () => {
    const dir = mkdtempSync(join(tmpdir(), 'the-site-'));
    try {
      alpha(dir);
      for (const version of ['0.1.8', '0.1.9', '0.2.0-beta', '1.0.0']) {
        const product = checkout(version);
        try {
          expect(() => withLogos(shown, { logos, dir, root: product }), version).toThrow(/have nothing to equal/);
        } finally {
          rmSync(product, { recursive: true, force: true });
        }
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops the build\'s own call on a file that differs from the product\'s, and passes on the product\'s own bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'the-site-'));
    const row = `| \`alpha.svg\` | Alpha | https://alpha.example | 2026-11-09 | \`${sha256('x')}\` |\n`;
    const same = checkout('0.1.8', { 'alpha.svg': 'x', 'SOURCES.md': row });
    const other = checkout('0.1.8', { 'alpha.svg': 'not x', 'SOURCES.md': row });
    try {
      alpha(dir);
      expect(withLogos(shown, { logos, dir, root: same })[0]?.logo?.file).toBe('alpha.svg');
      expect(() => withLogos(shown, { logos, dir, root: other })).toThrow(/is not the product's assets\/hosts\/alpha\.svg, byte for byte/);
    } finally {
      for (const d of [dir, same, other]) rmSync(d, { recursive: true, force: true });
    }
  });

  it('names a file the product does not hold, a file whose bytes differ and a hash that differs, for a checkout that has assets/hosts', () => {
    const product = mkdtempSync(join(tmpdir(), 'the-product-'));
    const site = mkdtempSync(join(tmpdir(), 'the-site-'));
    try {
      mkdirSync(join(product, PRODUCT_HOSTS_DIR), { recursive: true });
      writeFileSync(join(product, PRODUCT_HOSTS_DIR, 'a.svg'), 'x');
      writeFileSync(join(product, PRODUCT_HOSTS_DIR, 'SOURCES.md'), `| \`a.svg\` | A | https://a.example | 2026-11-09 | \`${sha256('x')}\` |\n`);
      writeFileSync(join(site, 'a.svg'), 'x');
      writeFileSync(join(site, 'b.svg'), 'y');
      const table = `| \`a.svg\` | A | https://a.example | 2026-11-09 | \`${sha256('x')}\` |\n| \`b.svg\` | B | https://b.example | 2026-11-09 | \`${sha256('y')}\` |`;
      expect(faultsAgainstProduct({ root: product, dir: site, sources: table }).join('\n')).toMatch(/b\.svg is not in the product's/);
      writeFileSync(join(site, 'a.svg'), 'changed');
      expect(faultsAgainstProduct({ root: product, dir: site, sources: table }).join('\n')).toMatch(/a\.svg is not the product's .*byte for byte/);
      const rehashed = table.replace(sha256('x'), sha256('changed'));
      expect(faultsAgainstProduct({ root: product, dir: site, sources: rehashed }).join('\n')).toMatch(/hashes a\.svg as/);
    } finally {
      rmSync(product, { recursive: true, force: true });
      rmSync(site, { recursive: true, force: true });
    }
  });
});

describe('the logos this repository holds', () => {
  it('are each a file of hosts/ with a row in hosts/SOURCES.md that hashes it, and every file of hosts/ has one', () => {
    expect(faultsOf({ sources: sources() })).toEqual([]);
    const rows = rowsOf(sources());
    expect(rows.length, 'the table was read').toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(readFileSync(join(SITE, HOSTS_DIR, row.file)).length, `${row.file} is not empty`).toBeGreaterThan(0);
      expect(sha256(readFileSync(join(SITE, HOSTS_DIR, row.file))), row.file).toBe(row.sha256);
    }
    expect(readdirSync(join(SITE, HOSTS_DIR)).filter((f) => f !== 'SOURCES.md').sort()).toEqual([...new Set(rows.map((r) => r.file))].sort());
  });

  it('say, in the sources file, the day they were fetched, where from, and the rule that lets a third party show them', () => {
    const text = sources();
    for (const row of rowsOf(text)) {
      const line = text.split('\n').find((l) => l.includes(`\`${row.file}\``)) ?? '';
      expect(line, row.file).toMatch(/\| \d{4}-\d{2}-\d{2} \|/);
      expect(line, row.file).toMatch(/https:\/\/\S+/);
      const section = new RegExp(`## ${row.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)(?=\\n## |$)`).exec(text)?.[1] ?? '';
      // The rule of use, quoted from the vendor's page; or, where none was found, that said with where it was looked for.
      expect(section, `${row.host} has its rule quoted, or says none was found`).toMatch(
        /The rule, from https:\/\/\S+[\s\S]*?"[^"]{30,}"|The rule: (?:none found[\s\S]*https:\/\/|[\s\S]*?"[^"]{30,}")/,
      );
      expect(section, `${row.host} says what this site does`).toMatch(/What this site does:/);
    }
  });
});

/** The rules of a stylesheet, flat: each selector of a comma list apart, and the block's declarations. */
function cssRulesOf(css: string): { selectors: string[]; body: string }[] {
  const out: { selectors: string[]; body: string }[] = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selectors: (m[1] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== ''), body: m[2] ?? '' });
  }
  return out;
}

/** The classes of the hosts strip: a selector made only of these and ending in `img` reaches a picture inside it. */
const STRIP_WORDS = new Set(['home', 'hosts-strip', 'hosts', 'pair', 'mark', 'wrap', 'ctr', 'mono', 'ul', 'li', 'a', 'section', 'div', 'main', 'body', 'html']);
const SCOPE = /:where\(\.(astro-[\w-]+)\)|\.(astro-[\w-]+)/g;
/**
 * Whether a selector reaches a picture of the hosts strip. A rule the framework scoped to a component's own class
 * (`:where(.astro-xxxx)`) reaches only the elements that carry that class: it counts only when `carried`, the scope classes
 * the strip's pictures carry in the built page, holds it. In a source file there is no scope class, and `carried` is empty.
 */
function reachesAnImageOfTheStrip(selector: string, carried: ReadonlySet<string> = new Set()): boolean {
  const scopes = [...selector.matchAll(SCOPE)].map((m) => m[1] ?? m[2] ?? '');
  if (scopes.some((s) => !carried.has(s))) return false;
  const parts = selector.replace(SCOPE, '').split(/[\s>+~]+/).filter((x) => x !== '');
  if (parts.length === 0 || !/^img(?:[:[].*)?$/.test(parts[parts.length - 1] ?? '')) return false;
  return parts.slice(0, -1).every((p) => (p.match(/(?:^|[.#])([a-z][\w-]*)/gi) ?? []).every((w) => STRIP_WORDS.has(w.replace(/^[.#]/, ''))));
}
/** A declaration that fixes the size of a box: height and width, their max- and min- forms, and the logical block-size and inline-size. */
const fixesASize = (body: string): boolean => /(?:^|[;\s])(?:(?:max|min)-)?(?:height|width|block-size|inline-size)\s*:/.test(body);

/** The text of the `<style>` blocks of an Astro component. */
const styleBlocksOf = (astro: string): string[] => [...astro.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '');

/** The Astro components that render the hosts strip, from `src/components/`, as paths from the site's root. */
function stripComponents(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(join(SITE, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.astro') ? [`${dir}/${e.name}`] : []));
  return walk('src/components').filter((f) => /class="[^"]*\bhosts-strip\b/.test(readText(join(SITE, f))));
}

describe('the Blossom of OpenAI, which the product shows at 40', () => {
  it("is Codex's logo, the product's white file (the page is dark), at height 40 where every other logo is at 20", () => {
    expect(LOGOS.Codex).toEqual({ file: 'OAI_OpenAI-Blossom_White.svg', href: 'https://openai.com/codex/', alt: '', width: 40, height: 40, owner: 'OpenAI' });
    expect(Object.entries(LOGOS).filter(([, logo]) => logo.height !== 20).map(([host]) => host)).toEqual(['Codex']);
  });

  it("is not squeezed to 20 by the page's style: no rule of the styles that reaches a picture of the hosts strip sets a fixed height or width", () => {
    const home = readText(join(SITE, 'src/styles/home.css'));
    expect(/^\.home \.mark img \{([^}]*)\}/m.exec(home)?.[1] ?? '', 'the rule for the logos is there').toContain('display');
    const components = stripComponents();
    expect(components, 'the component that renders the strip is found').toContain('src/components/home/HostsStrip.astro');
    const rules = [
      ...readdirSync(join(SITE, 'src/styles'))
        .filter((f) => f.endsWith('.css'))
        .flatMap((f) => cssRulesOf(readText(join(SITE, 'src/styles', f))).map((r) => ({ ...r, f }))),
      ...components.flatMap((f) => styleBlocksOf(readText(join(SITE, f))).flatMap((css) => cssRulesOf(css).map((r) => ({ ...r, f })))),
    ];
    expect(rules.filter((r) => r.selectors.some((s) => reachesAnImageOfTheStrip(s))).length, 'the rules read are there').toBeGreaterThan(0);
    expect(rules.filter((r) => r.selectors.some((s) => reachesAnImageOfTheStrip(s)) && fixesASize(r.body)).map((r) => `${r.f}: ${r.selectors.join(', ')}`)).toEqual([]);
  });

  it('sees a rule that pins the size of a picture of the strip, however the selector reaches it', () => {
    for (const css of ['.home .hosts img { height: 20px }', '.home .hosts-strip img{width:20px;display:block}', '.home .mark img { max-height: 20px }', '.home .mark img{min-width:20px}', '.home .mark img { block-size: 20px }', '.home .mark img { max-inline-size: 20px; }', '.home .mark img { min-block-size: 2rem }', '.home .pair ul img { height: 2rem }', '.home img { height: 20px }', 'img { height: 20px }']) {
      const [r] = cssRulesOf(css);
      expect(r?.selectors.some((s) => reachesAnImageOfTheStrip(s)) && fixesASize(r?.body ?? ''), css).toBe(true);
    }
    for (const css of ['.site-title img { height: 20px }', '.home .mark img { display: block; border-radius: 4px; }', '.home .hosts { gap: 10px }', '.home .mark img { line-height: 20px }']) {
      const [r] = cssRulesOf(css);
      expect(r?.selectors.some((s) => reachesAnImageOfTheStrip(s)) && fixesASize(r?.body ?? ''), css).toBe(false);
    }
  });

  it('reads the style blocks of the component that renders the strip, and a scoped rule counts only where the strip carries its scope class', () => {
    expect(styleBlocksOf('---\n---\n<div class="hosts-strip"></div>\n<style>.hosts img{height:20px}</style>')).toEqual(['.hosts img{height:20px}']);
    const scoped = '.hosts:where(.astro-abc123) img:where(.astro-abc123)';
    expect(reachesAnImageOfTheStrip(scoped), 'a scope class no picture of the strip carries').toBe(false);
    expect(reachesAnImageOfTheStrip(scoped, new Set(['astro-other'])), 'another scope class').toBe(false);
    expect(reachesAnImageOfTheStrip(scoped, new Set(['astro-abc123'])), 'the strip carries it').toBe(true);
    expect(reachesAnImageOfTheStrip('.site-title:where(.astro-abc123) img', new Set(['astro-abc123']))).toBe(false);
  });

  it("has its row and its section in the sources, and the product's file, byte for byte", () => {
    const row = rowsOf(sources()).find((r) => r.file === 'OAI_OpenAI-Blossom_White.svg');
    expect(row?.host).toBe('Codex');
    expect(readFileSync(join(SITE, HOSTS_DIR, 'OAI_OpenAI-Blossom_White.svg'), 'utf8')).toMatch(/^<svg width="716" height="716" viewBox="0 0 716 716"/);
    expect(sources()).toContain('## Codex\n');
    expect(sources()).not.toContain('The host shown by name');
  });
});

when('the built home page', () => {
  const page = (): string => readText(join(DIST, 'index.html'));
  const main = (): string => /<main\b[^>]*>([\s\S]*)<\/main>/.exec(page())?.[1] ?? '';
  const hosts = (): { name: string }[] => hostsOf(readText(join(ROOT, 'README.md'))).hosts;
  const builtCss = (): string =>
    readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(DIST, '_astro', f)))
      .join('\n');
  const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  it('shows each host of the README: by its logo and its name where it has a logo, by its name alone where it has none', () => {
    const list = hosts();
    expect(list.length).toBeGreaterThanOrEqual(12);
    expect(list.filter(({ name }) => !(name in LOGOS)).map((h) => h.name), 'the hosts shown by name alone').toEqual([]);
    for (const { name } of list) {
      const li = new RegExp(`(<li class="mark"><a href="([^"]+)"><img src="([^"]+)" alt(?:="([^"]*)")? width="\\d+" height="\\d+" loading="lazy"></a></li>)?<li class="host [a-z]+">${escape(name)} <b>[a-d]</b></li>`).exec(main());
      expect(li, `${name} is shown`).not.toBeNull();
      const logo = (LOGOS as Record<string, { file: string; href: string; alt: string }>)[name];
      if (logo === undefined) {
        expect(li?.[1], `${name} has no logo: it is shown by its name`).toBeUndefined();
      } else {
        expect(li?.[3], `${name} has its logo`).toBe(`/${HOSTS_DIR}/${logo.file}`);
        expect(li?.[2], `${name}'s logo links where the vendor's rule says`).toBe(logo.href);
        expect(li?.[4] ?? '').toBe(logo.alt);
      }
    }
    expect(main(), 'the Blossom is drawn at 40').toMatch(/<img src="\/hosts\/OAI_OpenAI-Blossom_White\.svg" alt(?:="")? width="40" height="40" loading="lazy">/);
  });

  it("has no stylesheet rule that sets a size on the hosts' pictures, a rule scoped to a component counting where the strip's pictures carry its class", () => {
    const rules = cssRulesOf(builtCss());
    // The scope classes the pictures of the strip carry in the built page (`astro-xxxx`): a scoped rule reaches them only by those.
    const carried = new Set([...main().matchAll(/<img\b[^>]*\ssrc="\/hosts\/[^"]*"[^>]*>/g)].flatMap((m) => [...m[0].matchAll(/\bastro-[\w-]+/g)].map((c) => c[0])));
    const reaches = (r: { selectors: string[] }): boolean => r.selectors.some((s) => reachesAnImageOfTheStrip(s, carried));
    expect(rules.length, 'the built stylesheet is read').toBeGreaterThan(50);
    expect(rules.filter(reaches).length, 'the rule for the logos is built').toBeGreaterThan(0);
    expect(rules.filter((r) => reaches(r) && fixesASize(r.body)).map((r) => r.selectors.join(', '))).toEqual([]);
  });

  it('serves each logo exactly as the vendor published it, and shows no other picture', () => {
    for (const row of rowsOf(sources())) {
      expect(sha256(readFileSync(join(DIST, HOSTS_DIR, row.file))), `${row.file} as served`).toBe(row.sha256);
    }
    expect(readdirSync(join(DIST, HOSTS_DIR)).sort()).toEqual([...new Set(rowsOf(sources()).map((r) => r.file))].sort());
    const pictures = [...main().matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
    expect(pictures.length).toBeGreaterThanOrEqual(11);
    for (const src of pictures) expect(rowsOf(sources()).map((r) => `/${HOSTS_DIR}/${r.file}`), `${src} is a logo with a source`).toContain(src);
  });

  it('names, in the footer, the owner of each logo it shows', () => {
    const footer = /<p class="marks">([^<]*)<\/p>/.exec(page())?.[1] ?? '';
    // The owners are pinned here, written out: a logo added or an owner changed in the build's list fails this case.
    const owners: Record<string, string> = {
      'Claude Code': 'Anthropic',
      'VS Code': 'Microsoft',
      'Copilot CLI': 'GitHub, Inc.',
      'Cursor CLI': 'Anysphere',
      OpenCode: 'Anomaly',
      'Gemini CLI': 'Google',
      'Qwen Code': 'the Qwen Code project',
      Cursor: 'Anysphere',
      'Antigravity CLI': 'Google',
      'Factory Droid': 'Factory',
      Goose: 'the Goose project',
      Codex: 'OpenAI',
    };
    expect(Object.fromEntries(Object.entries(LOGOS).map(([host, logo]) => [host, logo.owner]))).toEqual(owners);
    for (const owner of new Set(Object.values(owners))) expect(footer, `the owner ${owner}`).toContain(owner);
    expect(footer).toContain('imply no endorsement');
    expect(footer).toContain('identify the hosts mnema works with');
  });
});
