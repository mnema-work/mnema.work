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
  // The pages are the product's Markdown as written: a typographer would turn `--stdin` into a dash and a quote into a curly one.
  markdown: { smartypants: false },
  integrations: [
    starlight({
      title: 'mnema',
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: facts.repoUrl }],
      sidebar,
      customCss: [
        // Self-hosted, from the packages: no page asks another host for a font.
        '@fontsource-variable/archivo/wdth.css',
        '@fontsource/ibm-plex-mono/latin-400.css',
        '@fontsource/ibm-plex-mono/latin-500.css',
        '@fontsource/ibm-plex-mono/latin-600.css',
        './src/generated/theme.css',
        './src/styles/site.css',
      ],
      // The header's title is the mark beside the name (`SiteTitle.astro`): the eye, still, and the word of the brand.
      components: { Footer: './src/components/Footer.astro', SiteTitle: './src/components/SiteTitle.astro', SocialIcons: './src/components/SocialIcons.astro', ThemeProvider: './src/components/ThemeProvider.astro', ThemeSelect: './src/components/ThemeSelect.astro' },
      head: [
        // The favicon is the eye of the product's record page, one for the domain and not adaptive; it is the icon, and the PNG is only for browsers that draw no SVG in a tab.
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.png', type: 'image/png', sizes: '64x64' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' } },
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
