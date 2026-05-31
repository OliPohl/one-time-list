<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../global.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>One Time List</title>
</svelte:head>

{@render children()}
