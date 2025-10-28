<script lang="ts">
  import { infoOverlayVisible } from '../stores';
  import CloseButton from './CloseButton.svelte';

  import tabs from '$lib/content/tabs.yaml';
  import pressData from '$lib/content/press.yaml';
  import faqsData from '$lib/content/faqs.yaml';

  interface Tab {
    key: string;
    label: string;
    Component?: import('svelte').ComponentType;
  }

  interface PressItem {
    outlet: string;
    title: string;
    url: string;
    author?: string;
    year?: number;
    featured?: boolean;
  }

  interface FaqItem {
    q: string;
    a: string;
  }

  const mods = import.meta.glob('$lib/content/info/*.md', {
    eager: true
  }) as Record<string, { default: import('svelte').ComponentType }>;

  const markdownByKey: Record<string, import('svelte').ComponentType> = {};
  for (const [path, mod] of Object.entries(mods)) {
    const key = path.split('/').pop()?.replace('.md', '') ?? '';
    markdownByKey[key] = mod.default;
  }

  const sections = (tabs as Tab[]).map((t) => ({
    ...t,
    Component: markdownByKey[t.key] || undefined
  }));

  const LS_KEY = 'active_tab';
  let activeKey =
    (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) ||
    sections[0].key;

  $: if (activeKey) localStorage.setItem(LS_KEY, activeKey);

  function selectTab(key: string) {
    activeKey = key;
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  let container: HTMLElement;

  $: featuredPress = (pressData as PressItem[]).filter((p) => p.featured);
  $: allPress = (pressData as PressItem[]).filter((p) => !p.featured);
  $: faqsList = faqsData as FaqItem[];

  function closeInfoOverlay() {
    infoOverlayVisible.update(() => false);
    localStorage.removeItem(LS_KEY);
  }
</script>

<aside class="overlay overlay--info" bind:this={container}>
  <CloseButton functionOnClick={closeInfoOverlay}
    >close info overlay</CloseButton
  >

  <div class="header__menu__margin">
    <div class="info__tabs first__row">
      {#each sections.slice(0, 2) as s}
        <button
          class:active={activeKey === s.key}
          on:click={() => selectTab(s.key)}>{s.label}</button
        >
      {/each}
    </div>
    <div class="info__tabs">
      {#each sections.slice(2, 4) as s}
        <button
          class:active={activeKey === s.key}
          on:click={() => selectTab(s.key)}>{s.label}</button
        >
      {/each}
    </div>
  </div>
  <CloseButton functionOnClick={closeInfoOverlay}
    >close info overlay</CloseButton
  >
  <div class="overlay__outer">
    <div class="overlay__content">
      {#each sections as s}
        {#if activeKey === s.key}
          {#if s.Component}
            <section>
              {#if s.key === 'terms' || s.key === 'privacy'}
                <div class="privacy_policy overlay__section-text">
                  <svelte:component this={s.Component} />
                </div>
              {:else}
                <div class="overlay__section-text">
                  <svelte:component this={s.Component} />
                </div>
              {/if}
            </section>
          {:else if s.key === 'press'}
            <section>
              <h2 style="margin-bottom:0px;">Selected Press</h2>
              <div class="__press">
                {#each featuredPress as p}
                  <h2>{p.outlet}</h2>
                  <a href={p.url} rel="noopener noreferrer" target="_blank"
                    >{p.title}</a
                  >
                  {#if p.author}<span> By {p.author}</span>{/if}
                {/each}

                <h2 class="divider">All Press</h2>
                {#each allPress as p}
                  <h2>{p.outlet}</h2>
                  <a href={p.url} rel="noopener noreferrer" target="_blank"
                    >{p.title}</a
                  >
                  {#if p.author}<span> By {p.author}</span>{/if}
                {/each}
              </div>
            </section>
          {:else if s.key === 'faqs'}
            <section>
              {#each faqsList as item}
                <h2>{item.q}</h2>
                <div class="overlay__section-text">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: content from controlled YAML files -->
                  {@html item.a}
                </div>
              {/each}
            </section>
          {/if}
        {/if}
      {/each}
    </div>
    <div class="footer__menu__margin">
      <div class="info__tabs first__row">
        {#each sections.slice(4, 6) as s}
          <button
            class:active={activeKey === s.key}
            on:click={() => selectTab(s.key)}>{s.label}</button
          >
        {/each}
      </div>
      <div class="info__tabs">
        {#each sections.slice(6, 8) as s}
          <button
            class:active={activeKey === s.key}
            on:click={() => selectTab(s.key)}>{s.label}</button
          >
        {/each}
      </div>
    </div>
  </div>
</aside>

<style>
  a {
    cursor: pointer;
  }
  :global(ul) {
    list-style-type: disc;
    margin-top: -5px;
    padding-right: 1em;
  }
  :global(ul.voidcircle li) {
    margin-top: -5px;
    padding-bottom: 10px;
  }
  :global(ul.voidcircle) {
    padding-left: 3.5em;
    padding-right: 1.5em;
    list-style-type: circle;
  }
  :global(ol) {
    list-style-type: decimal;
    margin-top: -5px;
    padding-right: 1em;
    padding-left: 1em;
  }
  :global(ol li) {
    margin-top: -5px;
    padding-bottom: 10px;
  }
  .__press h2.divider {
    border-top: 1.01px solid var(--color-dark);
    padding-top: 1em;
    padding-left: 2.05rem;
    font-weight: bold !important;
  }
  .__press {
    display: flex;
    flex-direction: column;
  }
  .__press span {
    padding-left: 10px;
    margin-top: 10px;
    display: none;
  }
  .__press a {
    padding-left: 1em;
    padding-right: 1em;
    padding-top: 0px;
    font-size: 15px;
  }
  .__press h2 {
    font-size: 15.1px;
    border-top: 0px;
    padding-top: 4px;
    padding-left: 1em;
    padding-bottom: 0px;
    margin-bottom: 0px;
    font-weight: 400 !important;
  }
  .footer__menu__margin {
    margin-top: 20px;
    width: calc((40vw));
    position: sticky;
    bottom: 0px;
    background: var(--color-pink);
  }
  .header__menu__margin {
    width: calc((40% - 43px));
    left: 54px;
    position: fixed;
    background: var(--color-pink);
  }

  .info__tabs {
    display: flex;
    flex-wrap: nowrap;
    flex-direction: row;
    justify-content: center;
  }
  .info__tabs button {
    width: 50%;
    border: 1.01px solid var(--color-dark);
    height: 22.5px;
    font-size: 0.9rem;
    font-weight: 500;
    background: transparent;
    cursor: pointer;
    color: var(--color-dark);
  }
  .info__tabs button.active {
    background-color: var(--color-dark);
    color: var(--color-pink);
  }
  .info__tabs button:hover {
    background-color: black;
    color: var(--color-pink);
    transition-duration: 300ms;
    transition-timing-function: ease;
  }
  .info__tabs button:nth-child(odd) {
    border-left: 0px solid black;
    border-right: unset;
  }

  .info__tabs.first__row button {
    border-bottom: 0px;
  }
  :global(.partial_div-numbered) {
    display: flex;
    gap: 8px;
  }
  :global(.partial_div-numbered p) {
    margin-top: 0px;
  }
  :global(.partial_div-numbered span) {
    border: 1.01px solid var(--color-dark);
    border-radius: 50%;
    min-width: 22px;
    height: 22px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .overlay {
    height: 100%;
    position: fixed;
    z-index: var(--overlay-z-index);
    top: 0;
    background-color: var(--color-pink);
    overflow-x: hidden;
  }

  :global(.overlay__outer section p) {
    padding-left: 1em;
    padding-right: 1em;
  }
  :global(.overlay__outer section ul p) {
    padding-left: 0em;
    padding-right: 0em;
  }

  section {
    margin-top: 2em;
  }

  :global(h2) {
    text-decoration: none;
    font-size: 15px;
    color: var(--color-dark);
    display: block;
    font-weight: 500;
    padding-bottom: 4px;
    border-top: 1px solid var(--color-dark);
    padding-left: 2.05rem;
    padding-top: 1em;
  }
  :global(.overlay__content h2) {
    font-weight: bold;
    font-size: 15px;
  }
  @media (min-width: 800px) {
    h2 {
      font-size: 15px;
      padding-top: 1em;
    }
  }

  :global(.overlay__section-text) {
    text-decoration: none;
    color: var(--color-dark);
    display: block;
    margin-top: 1em;
    font-size: 15px;
  }

  :global(.overlay__section-text > *:first-child) {
    margin-top: 0;
  }

  :global(.overlay__section-text > *:last-child) {
    margin-bottom: 0;
  }

  :global(a) {
    text-decoration: underline;
    text-decoration-color: var(--color-dark);
    color: var(--color-dark);
  }

  :global(a:not(.closebtn):hover),
  :global(a:not(.closebtn):focus) {
    color: var(--color-pink-bright);
    text-decoration-color: var(--color-pink-bright);
  }

  .overlay--info {
    left: 0;
    z-index: 99999;
  }
  .overlay--info::-webkit-scrollbar {
    display: none;
  }

  .overlay--info {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .overlay__outer {
    padding-top: 11px;
  }
  @media (max-width: 800px) {
    h2 {
      padding-top: 1.05em;
      padding-bottom: 0px;
    }
    .overlay--info {
      margin-top: 9px;
      margin-left: 9px;
      margin-right: 9px;
      max-height: 98vh;
      background: transparent;
      width: calc(100vw - 18px);
    }
    .overlay__outer {
      background: var(--color-pink);
      border: 1.01px solid var(--color-dark);
      border-bottom: 0px;
    }
    .header__menu__margin {
      width: calc((100% - 63px));
      left: 54px;
    }
    .footer__menu__margin {
      width: 100%;
    }
  }

  @media (min-width: 800px) {
    .overlay__outer {
      width: calc(40vw);
      padding-top: 12px;
    }

    .overlay--info {
      left: 9px;
      top: 9px;
      border-right: var(--color-dark) solid 1px;
      border-left: var(--color-dark) solid 1px;
      box-shadow: 4px 0px 6px 0px rgba(0, 0, 0, 0.5);
      max-height: calc(100vh - 18px);
      height: unset;
    }

    .overlay__content {
      margin: 0;
      height: 125%;
    }
  }

  :global(.overlay__outer section .donate_button) {
    width: calc(100% - 2em);
    margin: auto;
    display: flex;
    justify-content: center;
  }

  :global(.donate_button) {
    display: inline-block;
    border: 1.01px solid var(--color-dark);
    background: var(--color-pink);
    color: var(--color-dark);
    box-shadow: 0 0 5px -1px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    padding: 10px 0px;
    text-align: center;
    font-size: 30px;
    text-transform: uppercase;
    text-decoration: none;
    transition-property: color, border-color, background-color;
    transition-duration: 300ms;
    transition-timing-function: ease;
    width: 100%;
    text-transform: uppercase;
    font-size: 20px;
    text-decoration: none !important;
    min-width: calc(100% - 1.5em);
  }

  :global(.button__fadein .donate_button:hover) {
    background: var(--color-dark);
    color: var(--color-pink) !important;
    transition-property: color, border-color, background-color;
    transition-duration: 300ms;
    transition-timing-function: ease;
    border: 1.01px solid var(--color-dark);
  }
</style>
