<!-- src/lib/app/PrivacyPolicy.svelte -->
<!-- Privacy policy, shown at the bottom of the settings. Keep it true: update it whenever the app starts
     sending data anywhere, loads anything from another server or sets cookies. -->
<script>
  const GITHUB_PRIVACY = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';
  const ISSUES = 'https://github.com/OliPohl/one-time-list/issues';
</script>

<div class="policy">
  <p class="updated">Last updated: October 2026</p>

  <h4>In short</h4>
  <p>
    This app doesn't collect any data about you. Everything you enter stays in your own browser.
    There are no accounts, no cookies, no tracking, no analytics and no ads.
  </p>

  <h4>What is stored and where</h4>
  <p>
    Your pages, tasks, widgets and settings are saved in your browser's local storage on this device, so they
    are still there the next time you open the app. They are never sent to me or anyone else, and they don't
    sync between devices or browsers.
  </p>

  <h4>No third parties</h4>
  <p>
    The app loads nothing from other servers: fonts and icons are served from this site. Sounds are generated
    in your browser.
  </p>

  <h4>Hosting</h4>
  <p>
    This site is hosted on GitHub Pages by GitHub, Inc. When you open it, GitHub's servers receive technical
    data such as your IP address to deliver the site and keep it secure. I have no access to this data.
    See the <a href={GITHUB_PRIVACY} target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>.
  </p>

  <h4>Deleting your data</h4>
  <p>
    Deleting a page removes everything saved for it. To remove all data, clear the site data for this page in
    your browser's settings.
  </p>

  <h4>Questions</h4>
  <p>
    This is a personal, non-commercial project. If you have questions, open an issue on
    <a href={ISSUES} target="_blank" rel="noopener noreferrer">GitHub</a>.
  </p>
</div>


<style>
  .policy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-soft);
  }

  .updated {
    color: var(--text-muted);
    font-size: 13px;
  }

  h4 {
    margin: 10px 0 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  p {
    margin: 0;
  }

  a {
    color: var(--accent);
    text-underline-offset: 2px;
  }
</style>
