# docs-kit

Shared packages for the [pelers](https://github.com/farhnkrnapratma/pelers-website), [markers](https://github.com/farhnkrnapratma/markers-website) and [MDRS](https://github.com/farhnkrnapratma/mdrs-website) documentation sites, and for any site that renders MDRS.

| Package | What it is |
| --- | --- |
| [`@farhnkrnapratma/docs-ui`](packages/ui) | Design tokens, fonts, theme and accessibility stores, and Svelte components |
| [`@mdrs/dom`](packages/dom) | Browser enhancements for HTML rendered by [`@mdrs/core`](https://github.com/farhnkrnapratma/mdrs): highlighted code blocks, tabs, charts, Mermaid diagrams drawn by [pelers](https://github.com/farhnkrnapratma/pelers), and heading anchors |
| [`@mdrs/editor`](packages/editor) | An MDRS editor with syntax highlighting, a formatting toolbar, a live preview, and diagnostics, completion, hover and an outline from [`@mdrs/language-server`](https://github.com/farhnkrnapratma/mdrs-language-server) |

The packages ship Svelte 5 and TypeScript source and are meant for SvelteKit or Vite projects, which compile them.

```sh
bun add @mdrs/dom @farhnkrnapratma/docs-ui
```

```svelte
<script lang="ts">
    import '@farhnkrnapratma/docs-ui/styles/global.css';
    import '@mdrs/dom/mdrs.css';
    import { enhanceMarkdownContent } from '@mdrs/dom';
    import MdrsHtml from '@mdrs/dom/MdrsHtml.svelte';

    let { html } = $props();
    let article: HTMLElement;
    $effect(() => {
        void enhanceMarkdownContent({ container: article });
    });
</script>

<article bind:this={article}><MdrsHtml {html} /></article>
```

`MdrsHtml` inserts the HTML as given, so pass it the output of `@mdrs/core`, which sanitizes it.

The editor needs a `render` function for its preview:

```svelte
<script lang="ts">
    import { MarkdownEditor } from '@mdrs/editor';
    import { load, prepareMarkdownPage } from '@mdrs/core/lazy';

    let value = $state('# Hello');
    const render = async (source: string) => {
        await load();
        return prepareMarkdownPage(source).html;
    };
</script>

<MarkdownEditor bind:value {render} />
```

Completion opens on `:`, `$`, `{` and `.`, or with Ctrl+Space. Code folding is not available, because the editor is a textarea over a highlighted copy of the text.

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) explains how to build, test and submit changes.

## License

Licensed under either of the [Apache License, Version 2.0](LICENSE-APACHE) or the [MIT License](LICENSE-MIT), at your option. The Paper Mono and Martian Mono fonts are under the [SIL Open Font License 1.1](LICENSES/OFL-1.1.txt).
