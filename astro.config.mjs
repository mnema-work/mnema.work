import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docsOf, theFacts } from './build/the-build.mjs';
import { isCheck, productRoot } from './build/the-product.mjs';
import { SITE } from './build/the-site.mjs';
import { redirectsFor } from './build/the-moved.mjs';
import { copyOf, pitchOf, sidebarOf, withoutWhatIsNotOnTheSite } from './build/the-pages.mjs';

// `build/build.mjs` hands this process the checkout it was given, as PRODUCT_DIR.
const ROOT = productRoot();
const facts = await theFacts(ROOT, { check: isCheck() });
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const { names: docs, read } = docsOf(ROOT);
const microcopy = copyOf(readFileSync(join(SITE, 'copy.md'), 'utf8'));
// The record page goes inside the group of the README that holds the verifier, under the label `copy.md` gives it.
const sidebar = sidebarOf({ readme, facts, docs, read, record: { label: microcopy.get('record'), link: '/record/' } });
// The social card: one picture for every page, at its address on the published site, and the README's line as its alt.
const card = `${facts.siteUrl}/og.png`;
const { title: cardAlt } = pitchOf(withoutWhatIsNotOnTheSite(readme, 'README.md'));

export default defineConfig({
  site: facts.siteUrl,
  // The docs addresses that moved keep answering, with a page that sends the reader on (build/the-moved.mjs).
  redirects: redirectsFor(docs),
  integrations: [
    starlight({
      title: 'mnema',
      favicon: '/favicon.svg',
      // The mark beside the name, which Starlight links to the root of the site: the home page.
      logo: { dark: './src/assets/mark-dark.svg', light: './src/assets/mark-light.svg', alt: '' },
      social: [{ icon: 'github', label: 'GitHub', href: facts.repoUrl }],
      sidebar,
      customCss: [
        // Self-hosted, from the packages: no page asks another host for a font.
        '@fontsource/jetbrains-mono/latin-400.css',
        '@fontsource/jetbrains-mono/latin-500.css',
        '@fontsource/jetbrains-mono/latin-700.css',
        '@fontsource/jetbrains-mono/latin-800.css',
        '@fontsource/instrument-sans/latin-400.css',
        '@fontsource/instrument-sans/latin-500.css',
        '@fontsource/instrument-sans/latin-600.css',
        './src/generated/theme.css',
        './src/styles/site.css',
      ],
      components: { Footer: './src/components/Footer.astro', SocialIcons: './src/components/SocialIcons.astro', ThemeProvider: './src/components/ThemeProvider.astro', ThemeSelect: './src/components/ThemeSelect.astro' },
      head: [
        // The adaptive SVG is the icon; the PNG is only for browsers that draw no SVG in a tab.
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.png', type: 'image/png', sizes: '64x64' } },
        { tag: 'meta', attrs: { property: 'og:image', content: card } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: cardAlt } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: card } },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: cardAlt } },
      ],
      lastUpdated: false,
      pagination: true,
    }),
  ],
});
