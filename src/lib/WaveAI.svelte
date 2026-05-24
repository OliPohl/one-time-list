<script>
	// Receive the state from the parent component ('bottom' or 'top')
	let { transformState = false } = $props();

	let pathDefinition = $state('');
	let isTransitioning = $state(false); // Controls the target speed state
	let targetSpeed = 0.003;             // Matches your static speed setting
	let currentSpeed = 0.003;            // Tracks the smooth easing step
	let count = 0;
	/**
	 * @type {number}
	 */
	let frameId;

	const width = 1000;
	const height = 2000;
	const baseLine = 200;

	function animate() {
		// 1. Update the target based on your transition state configuration
		targetSpeed = isTransitioning ? 0.03 : 0.003;

		// 2. Smoothly ease currentSpeed 5% closer to the target speed on every frame
		currentSpeed += (targetSpeed - currentSpeed) * 0.05;
		count += currentSpeed;

		let d = `M 0 ${height} L 0 ${baseLine}`;

		for (let x = 0; x <= width; x += 10) {
			let y1 = Math.sin(x * 0.005 + count) * 40;
			let y2 = Math.sin(x * 0.015 + count * 1.5) * 15;
			let y = baseLine + y1 + y2;

			d += ` L ${x} ${y}`;
		}

		d += ` L ${width} ${height} Z`;
		pathDefinition = d;

		frameId = requestAnimationFrame(animate);
	}

	// Handle transition lifecycle events
	function handleTransitionStart() {
		isTransitioning = true;
	}

	// When the 5s CSS transition ends, this flips to false, 
	// and the lerp engine above handles the gradual slow-down
	function handleTransitionEnd() {
		isTransitioning = false;
	}

	$effect(() => {
		frameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frameId);
	});
</script>

<div 
	class="wave-container" 
	class:at-bottom={transformState}
	ontransitionstart={handleTransitionStart}
	ontransitionend={handleTransitionEnd}
>
	<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none">
		<path d={pathDefinition} fill="#f73f43" />
	</svg>
</div>

<style>
	.wave-container {
		position: fixed;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		line-height: 0;
		
		/* The CSS transition that triggers our JS events */
		transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
		/* Top position state */
		top: 0; 
		transform: translateY(39%); /* Hidden off-screen or at the top */
	}

	/* Bottom position state */
	.wave-container.at-bottom {
		top: auto;
		bottom: 0;
		transform: translateY(78%);
	}

	svg {
		width: 100%;
		height: 100%;
	}
</style>