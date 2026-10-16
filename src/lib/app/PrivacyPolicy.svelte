<!-- src/lib/app/PrivacyPolicy.svelte -->
<!-- Privacy policy, shown at the bottom of the settings. Keep it true: update it whenever the app starts
     sending data anywhere, loads anything from another server or sets cookies. -->
<script>
  const GITHUB_PRIVACY = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';
  const ISSUES = 'https://github.com/OliPohl/taskbook/issues';
</script>

<div class="policy">
  <p class="updated">Last updated: October 2026</p>

  <h4>In short</h4>
  <p>
    This app doesn't collect any data about you. Everything you enter stays in your own browser.
    There are no accounts, no cookies, no tracking, no analytics and no ads. Only content you add from other
    sites yourself (such as a video embedded in a whiteboard) can bring its own, see below.
  </p>

  <h4>What is stored and where</h4>
  <p>
    Your pages, tasks, notes, drawings, widgets and settings are saved in your browser's local storage on this
    device, so they are still there the next time you open the app. They are never sent to me or anyone else, and
    they don't sync between devices or browsers.
  </p>
  <p>
    This includes images you upload: a picture for an image widget, or one you put on a whiteboard, is stored
    in your browser with the rest (an image widget's picture is made smaller first, so it fits). Uploading it
    doesn't send it anywhere. The whiteboard's library (shapes you keep to reuse) is stored the same way.
  </p>

  <h4>No third parties</h4>
  <p>
    The app itself loads nothing from other servers: fonts, icons and the whiteboard (Excalidraw) are served
    from this site. Sounds are generated in your browser. Only if the whiteboard's fonts can't be loaded from this
    site, it loads them from the esm.sh CDN instead.
  </p>
  <p>
    Only what you add or open yourself is loaded from elsewhere, and those sites then receive technical data such
    as your IP address:
  </p>
  <ul>
    <li>
      An image you add by its web address (to a note, a task description or an image widget) is loaded from that
      address, without telling it which page it's on.
    </li>
    <li>Links on a whiteboard open their sites when you click them.</li>
    <li>
      Web embeds on a whiteboard (a YouTube or Vimeo video, a tweet, a Figma file and the like) are loaded from
      their site when you open a whiteboard that has one and the embed is on screen. Previews (on a spread, the
      dashboard or a widget) only show a placeholder and load nothing. The site learns the address of this app and
      may set its own cookies and track what you do in the embed, under its own privacy policy. YouTube videos are
      loaded from youtube-nocookie.com, YouTube's privacy-enhanced mode, which according to YouTube doesn't use
      cookies that track what you watch; Google's privacy policy still applies.
    </li>
    <li>
      "Browse libraries" in the whiteboard's library opens Excalidraw's library site (libraries.excalidraw.com)
      in a new tab. The address of this app is passed along, so that site can send a library back. When it does,
      the app asks you first, and only then loads that library file from Excalidraw's site.
    </li>
    <li>
      Publishing a library from the whiteboard sends the shapes you chose and what you enter in that form (name,
      description, author name and handles) to Excalidraw's library service, which publishes them. Nothing is sent
      unless you submit that form.
    </li>
    <li>The whiteboard's help links (documentation, GitHub, blog) open those sites.</li>
  </ul>
  <p>
    The whiteboard runs without Excalidraw's online features: no collaboration, no sharing by link, no AI and
    no analytics.
  </p>

  <h4>Hosting</h4>
  <p>
    This site is hosted on GitHub Pages by GitHub, Inc. When you open it, GitHub's servers receive technical
    data such as your IP address to deliver the site and keep it secure. I have no access to this data.
    See the <a href={GITHUB_PRIVACY} target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>.
  </p>

  <h4>Deleting your data</h4>
  <p>
    Deleting a page removes everything saved for it. To remove all data, use "Clear Cache" in the settings or
    clear the site data for this page in your browser's settings.
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

  ul {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  a {
    color: var(--accent);
    text-underline-offset: 2px;
  }
</style>
