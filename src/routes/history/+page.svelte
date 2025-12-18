<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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
  class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 text-white font-inter flex flex-col items-center p-4 sm:p-6 md:p-8"
>
  <div class="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-4xl">
    <div class="mb-8">
      <h1 class="text-4xl sm:text-5xl font-bold text-yellow-300 text-center mb-6">Workout History</h1>

      <div class="flex justify-center mb-6">
        <a
          href="/"
          class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          ← Back to Tracker
        </a>
      </div>
    </div>

    {#if !hasAnyHistory}
      <div class="text-center py-12">
        <p class="text-xl text-gray-300 mb-4">No history yet. Complete workouts to see your progress here!</p>
        <p class="text-gray-400">Your workout history will appear once you complete sessions and your max weight changes.</p>
      </div>
    {:else}
      <div class="space-y-8">
        {#each Object.entries(exercises) as [exerciseName, exerciseData]}
          {@const sortedHistory = getSortedHistory(exerciseData)}
          {#if sortedHistory.length > 0}
            <div class="bg-gray-700 rounded-lg p-6 shadow-lg">
              <h2 class="text-2xl font-bold text-yellow-300 mb-4">{exerciseName}</h2>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-600">
                      <th class="text-left py-3 px-4 text-purple-300 font-semibold">Date</th>
                      <th class="text-left py-3 px-4 text-purple-300 font-semibold">Max Weight (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each sortedHistory as entry}
                      <tr class="border-b border-gray-600 hover:bg-gray-600 transition">
                        <td class="py-3 px-4 text-gray-200">{entry.date}</td>
                        <td class="py-3 px-4 text-gray-200 font-semibold">{entry.maxWeight}</td>
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
