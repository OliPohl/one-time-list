<!-- src/lib/NextTask.svelte -->
<script>

</script>


<div class="wrapper">
  <h1 class="heading">Next Task</h1>
  <div class="task-container">

  </div>
</div>


<style>
.wrapper {
  box-sizing: border-box;
  /* background-color: aliceblue; */
  width: 100%;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.heading {
  margin: 10px 0;
  font-family: "Stoke", serif;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: #7356f4;
}

.task-container {
  width: 100%;
  height: 160px;
  border-radius: 40px;
  border-style: dashed;
  border-width: 2.5px;
  border-color:#7356f4;
}
</style>