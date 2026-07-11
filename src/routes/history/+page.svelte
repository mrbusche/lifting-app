<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let exercises = $state({});
  let hasAnyHistory = $state(false);

  onMount(() => {
    if (browser) {
      try {
        const storedExercises = localStorage.getItem('liftingTrackerExercises');
        if (storedExercises) {
          const parsedExercises = JSON.parse(storedExercises);
          exercises = parsedExercises;

          // Check if any exercise has history
          hasAnyHistory = Object.values(parsedExercises).some((exercise) => Array.isArray(exercise.history) && exercise.history.length > 0);
        }
      } catch (error) {
        console.error('Error loading exercises from local storage:', error);
      }
    }
  });

  // Get sorted history for an exercise (newest first)
  function getSortedHistory(exercise) {
    if (!Array.isArray(exercise.history)) return [];
    return [...exercise.history].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  }
</script>

<div
  class="font-inter flex min-h-screen flex-col items-center bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 p-4 text-white sm:p-6 md:p-8"
>
  <div class="w-full max-w-4xl rounded-xl bg-gray-800 p-6 shadow-2xl sm:p-8 md:p-10">
    <div class="mb-8">
      <h1 class="mb-6 text-center text-4xl font-bold text-yellow-300 sm:text-5xl">Workout History</h1>

      <div class="mb-6 flex justify-center">
        <a
          href="/"
          class="transform rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:bg-purple-700"
        >
          ← Back to Tracker
        </a>
      </div>
    </div>

    {#if !hasAnyHistory}
      <div class="py-12 text-center">
        <p class="mb-4 text-xl text-gray-300">No history yet. Complete workouts to see your progress here!</p>
        <p class="text-gray-400">Your workout history will appear once you complete sessions and your max weight changes.</p>
      </div>
    {:else}
      <div class="space-y-8">
        {#each Object.entries(exercises) as [exerciseName, exerciseData]}
          {const sortedHistory = $derived(getSortedHistory(exerciseData))}
          {#if sortedHistory.length > 0}
            <div class="rounded-lg bg-gray-700 p-6 shadow-lg">
              <h2 class="mb-4 text-2xl font-bold text-yellow-300">{exerciseName}</h2>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-600">
                      <th class="px-4 py-3 text-left font-semibold text-purple-300">Date</th>
                      <th class="px-4 py-3 text-left font-semibold text-purple-300">Max Weight (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each sortedHistory as entry}
                      <tr class="border-b border-gray-600 transition hover:bg-gray-600">
                        <td class="px-4 py-3 text-gray-200">{entry.date}</td>
                        <td class="px-4 py-3 font-semibold text-gray-200">{entry.maxWeight}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: 'Inter', sans-serif;
  }
</style>
