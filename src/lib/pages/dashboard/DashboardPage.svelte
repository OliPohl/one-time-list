<!-- src/lib/pages/dashboard/DashboardPage.svelte -->
<!-- Overview of all pages. Empty for now, later it shows pages as widgets (each page type reads its store, e.g. `getListStore`). -->

<main class="dashboard">
  <h1 class="heading">Dashboard</h1>
</main>


<style>
  .dashboard {
    box-sizing: border-box;
    max-width: 600px;
    min-height: 100vh;
    margin: auto;
    padding: 80px 10px 40px;
  }

  .heading {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 40px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }
</style>
