<!-- src/lib/widgets/components/ProgressBorder.svelte -->
<!-- A widget border that shows how far a countdown has run: the `fill` color shrinks clockwise from the top
     center, the `track` color shows behind it. Drawn as an SVG path so it moves evenly along every side. -->
<script>
  import { elapsedNow } from '../views.js';
  /**
   * `width` and `height` are the widget's border box, `radius` its corner radius, `stroke` its border width.
   * @type {{progress: import('../views.js').Progress, width: number, height: number, radius: number, stroke?: number}}
   */
  let { progress, width, height, radius, stroke = 2.5 } = $props();

  /** Rounded rectangle along the middle of the border, starting at the top center and going clockwise. */
  let path = $derived.by(() => {
    const s = stroke / 2;
    const r = Math.max(0, Math.min(radius, height / 2, width / 2) - s);
    const right = width - s;
    const bottom = height - s;
    return [
      `M ${width / 2} ${s}`,
      `H ${right - r}`,
      `A ${r} ${r} 0 0 1 ${right} ${s + r}`,
      `V ${bottom - r}`,
      `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
      `H ${s + r}`,
      `A ${r} ${r} 0 0 1 ${s} ${bottom - r}`,
      `V ${s + r}`,
      `A ${r} ${r} 0 0 1 ${s + r} ${s}`,
      'Z'
    ].join(' ');
  });

  // The path counts 100 units long: the fill starts where the elapsed part ends and runs to the top center.
  // Recomputed every frame while counting, so it moves smoothly.
  let elapsed = $derived(elapsedNow(progress) * 100);
</script>

{#if width > 0 && height > 0}
  <svg class="progress-border" {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
    <!-- Colors as styles: they are CSS variables, which SVG attributes don't resolve in every browser. -->
    <path d={path} pathLength="100" style:stroke={progress.track} stroke-width={stroke} />
    <path
      d={path}
      pathLength="100"
      style:stroke={progress.fill}
      stroke-width={stroke}
      class="fill"
      style:stroke-dasharray="{100 - elapsed} 100"
      style:stroke-dashoffset={-elapsed} />
  </svg>
{/if}


<style>
  /* Sits exactly on the widget's (transparent) border. */
  .progress-border {
    position: absolute;
    top: calc(var(--border-width, 2.5px) * -1);
    left: calc(var(--border-width, 2.5px) * -1);
    overflow: visible;
    pointer-events: none;
  }

  path {
    fill: none;
  }
</style>
