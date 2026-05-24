<!-- src/lib/Wave.svelte -->
 <script>
  let { bottom = false } = $props();

  let path = $state('');

  const width = 1920;
	const height = 1080;

  const frequency1 = 0.006;
  const amplitude1 = 7;

  const frequency2 = 0.008;
  const amplitude2 = 10;

  const baseSpeed = 0.005;

  let count = 0;

  /**
	 * @type {number}
	 */
  let frameId;

  function animate() {
    count += baseSpeed;

    let d = `M 0 ${height} L 0 0`;

		for (let x = 0; x <= width; x += 10) {
			let y1 = Math.sin(x * frequency1 + count) * amplitude1;
			let y2 = Math.sin(x * frequency2 + count * 1.5) * amplitude2;
			let y = y1 + y2;

			d += ` L ${x} ${y}`;
		}

		d += ` L ${width} ${height} Z`;
		path = d;

		frameId = requestAnimationFrame(animate);
	}

  $effect(() => {
		frameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frameId);
	});
 </script>


<div class="wave-container" class:bottom={bottom}>
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none">
		<path d={path} fill=#f73f43 />
	</svg>
</div>


<style>
  .wave-container {
    position: fixed;
    top: 50%;
    left: 0;
    width: 100%;
    height: 100vh;
    overflow: visible;
    transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .wave-container.bottom {
    transform: translateY(38vh);
  }

  svg {
    overflow: visible;
		width: 100%;
		height: 100%;
	}
</style>