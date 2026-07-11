<script module>
  // Default max dumbbell weight for adjustable dumbbells
  const DEFAULT_MAX_DUMBBELL_WEIGHT = 52.5;

  // Define the structure and rules for each lifting phase
  const phases = {
    'Base Phase': {
      sets: 3,
      repsPerSet: 10,
      percentages: [65, 70, 75],
      sessions: 4,
      progression: [
        { repsRange: [0, 7], change: -5, text: '0-7 reps: Decrease 5 pounds' },
        { repsRange: [8, 9], change: 0, text: '8-9 reps: No change' },
        { repsRange: [10, 11], change: 5, text: '10-11 reps: Increase 5 pounds' },
        { repsRange: [12, Infinity], change: 10, text: '12+ reps: Increase 10 pounds' },
      ],
    },
    'Strength Phase One': {
      sets: 4,
      repsPerSet: 8,
      percentages: [60, 70, 75, 80],
      sessions: 4,
      progression: [
        { repsRange: [0, 6], change: -5, text: '0-6 reps: Decrease 5 pounds' },
        { repsRange: [7, 7], change: 0, text: '7 reps: No change' },
        { repsRange: [8, 9], change: 5, text: '8-9 reps: Increase 5 pounds' },
        { repsRange: [10, Infinity], change: 10, text: '10+ reps: Increase 10 pounds' },
      ],
    },
    'Strength Phase Two': {
      sets: 5,
      repsPerSet: 6,
      percentages: [65, 70, 75, 80, 85],
      sessions: 4,
      progression: [
        { repsRange: [0, 4], change: -5, text: '0-4 reps: Decrease 5 pounds' },
        { repsRange: [5, 5], change: 0, text: '5 reps: No change' },
        { repsRange: [6, 7], change: 5, text: '6-7 reps: Increase 5 pounds' },
        { repsRange: [8, Infinity], change: 10, text: '8+ reps: Increase 10 pounds' },
      ],
    },
    'Peak Phase': {
      sets: 6,
      repsPerSet: [10, 8, 6, 4, 3, 2], // Specific reps for each set
      percentages: [50, 60, 70, 80, 85, 90], // Specific percentages for each set
      sessions: 6,
      progression: [
        { repsRange: [0, 1], change: -5, text: '0-1 reps: Decrease 5 pounds' },
        { repsRange: [2, 2], change: 0, text: '2 reps: No change' },
        { repsRange: [3, 3], change: 5, text: '3 reps: Increase 5 pounds' },
        { repsRange: [4, Infinity], change: 10, text: '4+ reps: Increase 10 pounds' },
      ],
    },
  };

  // Helper function to round weight based on value
  function roundWeight(weight) {
    // For weights between 5 and 25 pounds, round to nearest 2.5 pounds
    if (weight >= 5 && weight <= 25) {
      return Math.round(weight / 2.5) * 2.5;
    }
    // For all other weights, round to nearest 5 pounds
    return Math.round(weight / 5) * 5;
  }

  // Calculate equivalent reps using Brzycki Formula
  // Formula: 1RM = weight / (1.0278 - 0.0278 * reps)
  // Given: prescribed reps at target weight, find equivalent reps at maxDumbbellWeight
  function calculateEquivalentReps(targetWeight, maxDumbbellWeight, oneRepMax, prescribedReps) {
    if (!maxDumbbellWeight || maxDumbbellWeight <= 0) return null; // Not set or invalid
    if (targetWeight <= maxDumbbellWeight) return null; // No need for equivalent if within range
    if (maxDumbbellWeight >= oneRepMax) return null; // Invalid: can't calculate meaningful reps

    // Step 1: Calculate the implied 1RM from doing prescribedReps at targetWeight
    const impliedOneRM = targetWeight / (1.0278 - 0.0278 * prescribedReps);

    // Step 2: Calculate how many reps at maxDumbbellWeight would give the same 1RM
    // impliedOneRM = maxDumbbellWeight / (1.0278 - 0.0278 * reps)
    // Solving for reps: reps = (1.0278 - maxDumbbellWeight / impliedOneRM) / 0.0278
    const reps = (1.0278 - maxDumbbellWeight / impliedOneRM) / 0.0278;

    if (reps < 1) return null; // Invalid: result doesn't make physical sense
    return Math.round(reps);
  }
</script>

<script>
  import { browser } from '$app/environment'; // Import 'browser' from SvelteKit's environment module
  import { onMount } from 'svelte';

  // State variables
  let exercises = $state({});
  let selectedExerciseName = $state(null);
  let newExerciseName = $state('');
  let newExerciseMaxWeight = $state('');
  let newMaxDumbbellWeight = $state('0');
  let completionMessage = $state('');
  let showCompletionMessage = $state(false);
  let isManageExercisesExpanded = $state(true);
  let isExportImportExpanded = $state(false);
  let isPhaseDetailsExpanded = $state(true);

  // Derived state
  let currentExerciseData = $derived(selectedExerciseName ? exercises[selectedExerciseName] : null);
  let currentPhase = $derived(currentExerciseData ? phases[currentExerciseData.currentPhaseName] : null);
  let phaseNames = $derived(Object.keys(phases));
  let currentPhaseIndex = $derived(currentExerciseData ? phaseNames.indexOf(currentExerciseData.currentPhaseName) : -1);

  // Reactive calculation of target weights for the current exercise and phase
  let targetWeights = $derived(
    currentPhase && currentExerciseData
      ? currentPhase.percentages.map((pct) => {
          const rawWeight = currentExerciseData.maxWeight * (pct / 100);
          return roundWeight(rawWeight);
        })
      : [],
  );

  // --- Load Exercises from Local Storage on initial mount ---
  onMount(() => {
    if (browser) {
      // Only run in the browser
      try {
        const storedExercises = localStorage.getItem('liftingTrackerExercises');
        if (storedExercises) {
          const parsedExercises = JSON.parse(storedExercises);
          for (const key in parsedExercises) {
            const exercise = parsedExercises[key];
            // Ensure repsCompleted is always an array
            if (!Array.isArray(exercise.repsCompleted)) {
              exercise.repsCompleted = [];
            }
            // Ensure correct length for current phase
            const phase = phases[exercise.currentPhaseName];
            if (phase && exercise.repsCompleted.length !== phase.sets) {
              exercise.repsCompleted = Array(phase.sets).fill('');
            }
            // Initialize history array if it doesn't exist
            if (!Array.isArray(exercise.history)) {
              exercise.history = [];
            }
            // Initialize maxDumbbellWeight if it doesn't exist (0 means not set)
            if (exercise.maxDumbbellWeight === undefined) {
              exercise.maxDumbbellWeight = 0;
            }
          }
          exercises = parsedExercises;
          // Set selectedExerciseName after exercises are loaded
          if (Object.keys(exercises).length > 0) {
            if (!selectedExerciseName) {
              selectedExerciseName = Object.keys(exercises)[0];
            }
            isManageExercisesExpanded = false;
          }
        }
      } catch (error) {
        console.error('Error loading exercises from local storage:', error);
        completionMessage = 'Failed to load saved exercises. Local storage might be corrupted.';
        showCompletionMessage = true;
      }
    }
  });

  // --- Save Exercises to Local Storage whenever 'exercises' state changes ---
  $effect(() => {
    if (browser) {
      // Only run in the browser
      try {
        if (Object.keys(exercises).length > 0) {
          // Prepare data for saving: stringify repsCompleted arrays
          const exercisesToSave = {};
          for (const key in exercises) {
            exercisesToSave[key] = {
              ...exercises[key],
              repsCompleted: JSON.stringify(exercises[key].repsCompleted),
            };
          }
          console.log('Exercises to save:', exercisesToSave);
          localStorage.setItem('liftingTrackerExercises', JSON.stringify(exercisesToSave));
        }
      } catch (error) {
        console.error('Error saving exercises to local storage:', error);
        completionMessage = 'Failed to save progress. Local storage might be full or inaccessible.';
        showCompletionMessage = true;
      }
    }
  });

  // Function to handle adding a new exercise
  function handleAddExercise() {
    const weight = parseFloat(newExerciseMaxWeight);
    const maxDumbbell = parseFloat(newMaxDumbbellWeight);
    if (!newExerciseName.trim()) {
      completionMessage = 'Please enter a name for the exercise.';
      showCompletionMessage = true;
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      completionMessage = 'Please enter a valid positive number for the max weight.';
      showCompletionMessage = true;
      return;
    }
    if (isNaN(maxDumbbell) || maxDumbbell < 0) {
      completionMessage = 'Please enter a valid number (0 or greater) for the max dumbbell weight.';
      showCompletionMessage = true;
      return;
    }
    if (exercises[newExerciseName.trim()]) {
      completionMessage = `An exercise named "${newExerciseName.trim()}" already exists. Please choose a different name.`;
      showCompletionMessage = true;
      return;
    }

    const newExerciseData = {
      maxWeight: weight,
      maxDumbbellWeight: maxDumbbell,
      currentPhaseName: 'Base Phase',
      currentSessionIndex: 0,
      repsCompleted: Array(phases['Base Phase'].sets).fill(''), // Initialize reps for the new exercise
      history: [], // Track history of max weight changes
    };

    exercises[newExerciseName.trim()] = newExerciseData;
    selectedExerciseName = newExerciseName.trim();
    newExerciseName = '';
    newExerciseMaxWeight = '';
    newMaxDumbbellWeight = '0'; // Reset to 0 (not set)
    completionMessage = 'Exercise added successfully!';
    showCompletionMessage = true;
  }

  // Function to calculate the target weight for a given percentage, rounded appropriately
  function calculateWeight(percentage) {
    const exercise = exercises[selectedExerciseName];
    if (!exercise) return 0;
    const rawWeight = exercise.maxWeight * (percentage / 100);
    return roundWeight(rawWeight);
  }

  // Function to calculate the next max weight based on the last set's performance
  function calculateNextMaxWeight() {
    if (!currentExerciseData || !currentPhase) return currentExerciseData.maxWeight;

    const lastSetReps = parseInt(currentExerciseData.repsCompleted[currentExerciseData.repsCompleted.length - 1]);
    if (isNaN(lastSetReps)) {
      completionMessage = 'Please enter reps completed for the final set before completing the session.';
      showCompletionMessage = true;
      return currentExerciseData.maxWeight;
    }

    let weightChange = 0;
    // Find the applicable progression rule for the current phase
    for (const rule of currentPhase.progression) {
      const [minReps, maxReps] = rule.repsRange;
      if (lastSetReps >= minReps && lastSetReps <= maxReps) {
        weightChange = rule.change;
        break;
      }
    }
    // Ensure the new max weight is also rounded appropriately
    return roundWeight(currentExerciseData.maxWeight + weightChange);
  }

  // Function to complete the current session
  function completeSession() {
    if (!selectedExerciseName || !currentExerciseData || !currentPhase) return;

    // Check if the final set reps are entered
    const lastSetReps = currentExerciseData.repsCompleted[currentExerciseData.repsCompleted.length - 1];
    if (lastSetReps === '' || isNaN(parseInt(lastSetReps))) {
      completionMessage = 'Please enter reps completed for the final set before completing the session.';
      showCompletionMessage = true;
      return;
    }

    const newMaxWeight = calculateNextMaxWeight();
    const oldMaxWeight = exercises[selectedExerciseName].maxWeight;

    // Update the current exercise data directly
    exercises[selectedExerciseName].maxWeight = newMaxWeight;

    // Record history entry if max weight changed
    if (newMaxWeight !== oldMaxWeight) {
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      if (!Array.isArray(exercises[selectedExerciseName].history)) {
        exercises[selectedExerciseName].history = [];
      }
      exercises[selectedExerciseName].history.push({
        date: today,
        maxWeight: newMaxWeight,
      });
    }

    // Determine if phase or session changes
    if (exercises[selectedExerciseName].currentSessionIndex === currentPhase.sessions - 1) {
      // Phase completed - advance to next phase if available
      const nextPhaseIndex = currentPhaseIndex + 1;
      if (nextPhaseIndex < phaseNames.length) {
        const nextPhaseName = phaseNames[nextPhaseIndex];
        const nextPhase = phases[nextPhaseName];
        exercises[selectedExerciseName].currentPhaseName = nextPhaseName;
        exercises[selectedExerciseName].currentSessionIndex = 0;
        exercises[selectedExerciseName].repsCompleted = Array(nextPhase.sets).fill('');
        completionMessage = `Phase "${currentExerciseData.currentPhaseName}" completed for ${selectedExerciseName}! Moving to "${nextPhaseName}". Your new max weight is ${newMaxWeight} lbs.`;
      } else {
        // All phases completed - restart from Base Phase
        const firstPhaseName = phaseNames[0];
        const firstPhase = phases[firstPhaseName];
        exercises[selectedExerciseName].currentPhaseName = firstPhaseName;
        exercises[selectedExerciseName].currentSessionIndex = 0;
        exercises[selectedExerciseName].repsCompleted = Array(firstPhase.sets).fill('');
        completionMessage = `Congratulations! All phases completed for ${selectedExerciseName}! Your final max weight is ${newMaxWeight} lbs. Restarting from "${firstPhaseName}".`;
      }
      showCompletionMessage = true;
    } else {
      completionMessage = `Session ${exercises[selectedExerciseName].currentSessionIndex + 1} completed for ${selectedExerciseName}! Your new max weight for the next session is ${newMaxWeight} lbs.`;
      showCompletionMessage = true;
      exercises[selectedExerciseName].currentSessionIndex += 1; // Move to the next session
      exercises[selectedExerciseName].repsCompleted = Array(currentPhase.sets).fill('');
    }
  }

  // --- Export and Import Functions ---
  // Export exercises as JSON file
  function exportExercises() {
    const dataStr = JSON.stringify(exercises, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'liftingTrackerExercises.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import exercises from JSON file
  function importExercises(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        for (const key in imported) {
          const exercise = imported[key];
          if (!Array.isArray(exercise.repsCompleted)) {
            exercise.repsCompleted = [];
          }
          const phase = phases[exercise.currentPhaseName];
          if (phase && exercise.repsCompleted.length !== phase.sets) {
            exercise.repsCompleted = Array(phase.sets).fill('');
          }
        }
        exercises = imported;
        localStorage.setItem('liftingTrackerExercises', JSON.stringify(imported));
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  // Function to reset all data with confirmation
  function resetAllData() {
    if (confirm('Are you sure you want to reset all exercises and clear all saved data? This cannot be undone.')) {
      exercises = {};
      selectedExerciseName = null;
      localStorage.removeItem('liftingTrackerExercises');
      completionMessage = 'All data has been reset.';
      showCompletionMessage = true;
    }
  }
</script>

{#snippet sectionHeader(
  title,
  expanded,
  onToggle,
  colorClass = 'text-yellow-300',
  hoverClass = 'hover:text-yellow-400',
  titleClass = 'text-2xl',
)}
  <div class="flex items-center justify-between">
    <h2 class="{titleClass} font-bold {colorClass} flex-1 text-center">{title}</h2>
    <button
      onclick={onToggle}
      class="{colorClass} {hoverClass} text-2xl font-bold focus:outline-none"
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >
      {expanded ? '−' : '+'}
    </button>
  </div>
{/snippet}

{#snippet actionButton(label, onclick, classes)}
  <button
    {onclick}
    class="transform rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 {classes}"
  >
    {label}
  </button>
{/snippet}

<div class="font-inter flex min-h-screen flex-col items-center bg-gradient-to-br from-gray-900 to-gray-700 p-4 text-white sm:p-6 md:p-8">
  <div class="flex w-full max-w-4xl flex-col items-center rounded-xl bg-gray-800 p-6 shadow-2xl sm:p-8 md:p-10">
    <h1
      class="mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-center text-4xl font-extrabold text-transparent sm:text-5xl"
    >
      Lifting Program Tracker
    </h1>

    <!-- Navigation to History -->
    <div class="mb-6 flex w-full justify-center">
      <a
        href="/history"
        class="transform rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:from-purple-700 hover:to-pink-700"
      >
        View Workout History
      </a>
    </div>

    <!-- Exercise Management Section -->
    <div class="mb-6 w-full rounded-lg bg-gray-700 p-5 shadow-lg">
      {@render sectionHeader('Manage Exercises', isManageExercisesExpanded, () => (isManageExercisesExpanded = !isManageExercisesExpanded))}

      <!-- Add New Exercise (Collapsible) -->
      {#if isManageExercisesExpanded}
        <div class="mb-6 flex flex-col gap-4">
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <input
              type="text"
              bind:value={newExerciseName}
              placeholder="New Exercise Name (e.g., Bench Press)"
              class="w-full rounded-lg border border-gray-500 bg-gray-600 p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none sm:w-1/2"
            />
            <input
              type="number"
              bind:value={newExerciseMaxWeight}
              placeholder="Initial Max Weight (lbs)"
              class="w-full rounded-lg border border-gray-500 bg-gray-600 p-3 text-center text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none sm:w-1/4"
            />
            <input
              type="number"
              step="0.5"
              bind:value={newMaxDumbbellWeight}
              placeholder="Max Dumbbell (lbs)"
              class="w-full rounded-lg border border-gray-500 bg-gray-600 p-3 text-center text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none sm:w-1/4"
            />
            {@render actionButton(
              'Add Exercise',
              handleAddExercise,
              'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 w-full sm:w-auto',
            )}
          </div>
          <p class="text-center text-sm text-gray-400">
            Max dumbbell weight is typically {DEFAULT_MAX_DUMBBELL_WEIGHT} lbs for adjustable dumbbells. Set to 0 to disable equivalent reps,
            or enter your max weight to see equivalent reps when target weights exceed it.
          </p>
        </div>
      {/if}

      <!-- Select Existing Exercise (Always Visible) -->
      {#if Object.keys(exercises).length > 0}
        <div class="text-center">
          <label for="exercise-select" class="mr-3 text-lg text-gray-200">Select Exercise:</label>
          <select
            id="exercise-select"
            bind:value={selectedExerciseName}
            class="rounded-lg border border-gray-500 bg-gray-600 p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
          >
            <option value={null} disabled>-- Choose an Exercise --</option>
            {#each Object.keys(exercises) as name}
              <option value={name}>{name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <!-- Completion Message Display -->
    {#if showCompletionMessage}
      <div class="bg-opacity-30 relative mb-6 w-full rounded-lg border border-blue-500 bg-blue-600 p-4 text-center shadow-md">
        <button
          onclick={() => (showCompletionMessage = false)}
          class="absolute top-2 right-2 text-xl font-bold text-blue-200 transition-colors duration-200 hover:text-white"
          aria-label="Close message"
        >
          ×
        </button>
        <p class="pr-8 text-lg font-medium">{completionMessage}</p>
      </div>
    {/if}

    <!-- Main Program Display (after selecting an exercise) -->
    {#if selectedExerciseName && currentExerciseData && currentPhase}
      <div class="mb-6 w-full rounded-lg bg-gray-700 p-5 shadow-lg">
        {@render sectionHeader(
          currentExerciseData.currentPhaseName,
          isPhaseDetailsExpanded,
          () => (isPhaseDetailsExpanded = !isPhaseDetailsExpanded),
          'text-purple-300',
          'hover:text-purple-400',
          'text-3xl',
        )}

        {#if isPhaseDetailsExpanded}
          <p class="mb-4 text-center text-lg text-gray-300">
            Session {currentExerciseData.currentSessionIndex + 1} of {currentPhase.sessions}, max weight
            <span class="text-yellow-400">{currentExerciseData.maxWeight} lbs</span>
          </p>

          <!-- Max Dumbbell Weight Setting -->
          <div class="mb-4 flex flex-row items-center justify-center gap-2">
            <label for="max-dumbbell" class="text-gray-300">Max Dumbbell Weight:</label>
            <input
              id="max-dumbbell"
              type="number"
              step="0.5"
              bind:value={currentExerciseData.maxDumbbellWeight}
              class="w-24 rounded-lg border border-gray-500 bg-gray-600 p-2 text-center text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            />
            <span class="text-gray-300">lbs</span>
          </div>

          <!-- Phase Details -->
          <div class="grid grid-cols-1 gap-4 text-gray-200 md:grid-cols-2">
            <div>
              <h3 class="mb-2 text-xl font-semibold text-pink-400">Workout Details:</h3>
              {#if currentExerciseData.currentPhaseName !== 'Peak Phase'}
                <p>Sets: {currentPhase.sets}</p>
              {:else}
                <p>Sets: {currentPhase.sets} (Varying Reps/Percentages)</p>
              {/if}
              {#if currentExerciseData.currentPhaseName !== 'Peak Phase'}
                <p>Reps per Set: {currentPhase.repsPerSet}</p>
              {/if}
              <p>Percentages of Max:</p>
              <ul class="ml-4 list-inside list-disc">
                {#each currentPhase.percentages as pct, index}
                  {const prescribedReps = $derived(
                    currentExerciseData.currentPhaseName === 'Peak Phase' ? currentPhase.repsPerSet[index] : currentPhase.repsPerSet,
                  )}
                  {const equivalentReps = $derived(
                    calculateEquivalentReps(
                      targetWeights[index],
                      currentExerciseData.maxDumbbellWeight,
                      currentExerciseData.maxWeight,
                      prescribedReps,
                    ),
                  )}
                  <li>
                    Set {index + 1}: {pct}% (Target: {targetWeights[index]} lbs)
                    {#if equivalentReps !== null}
                      <br />
                      <span class="ml-6 text-cyan-400">
                        → {equivalentReps} reps @ {currentExerciseData.maxDumbbellWeight} lbs (equivalent)
                      </span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>

            <!-- Progression Rules -->
            <div>
              <h3 class="mb-2 text-xl font-semibold text-pink-400">Progression Rules (Based on Last Set):</h3>
              <ul class="ml-4 list-inside list-disc">
                {#each currentPhase.progression as rule, index}
                  <li>{rule.text}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </div>

      <!-- Reps Input for Current Session -->
      <div class="mb-6 w-full rounded-lg bg-gray-700 p-5 shadow-lg">
        <h3 class="mb-4 text-center text-2xl font-bold text-green-400">
          Enter Reps Completed for Session {currentExerciseData.currentSessionIndex + 1}
        </h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each Array(currentPhase.sets) as _, index}
            {const prescribedReps = $derived(
              currentExerciseData.currentPhaseName === 'Peak Phase' ? currentPhase.repsPerSet[index] : currentPhase.repsPerSet,
            )}
            {const equivalentReps = $derived(
              calculateEquivalentReps(
                targetWeights[index],
                currentExerciseData.maxDumbbellWeight,
                currentExerciseData.maxWeight,
                prescribedReps,
              ),
            )}
            <div class="flex flex-col gap-1">
              <div class="flex flex-row items-center justify-start gap-4">
                <label for="set-{index}" class="text-lg text-gray-200">
                  Set {index + 1} ({currentExerciseData.currentPhaseName === 'Peak Phase'
                    ? currentPhase.repsPerSet[index]
                    : currentPhase.repsPerSet} reps @ {targetWeights[index]} lbs)
                </label>
                {#if index === currentPhase.sets - 1}
                  <input
                    id="set-{index}"
                    type="number"
                    bind:value={currentExerciseData.repsCompleted[index]}
                    placeholder="Reps done"
                    class="w-24 rounded-lg border border-gray-500 bg-gray-600 p-2 text-center text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                {:else}
                  <div class="flex h-10 items-center justify-center">
                    <input
                      id="set-{index}"
                      type="checkbox"
                      bind:checked={currentExerciseData.repsCompleted[index]}
                      class="h-6 w-6 cursor-pointer rounded border-gray-500 bg-gray-600 text-green-500 focus:ring-green-500"
                    />
                  </div>
                {/if}
              </div>
              {#if equivalentReps !== null}
                <p class="ml-0 text-sm text-cyan-400">
                  Use {currentExerciseData.maxDumbbellWeight} lbs × {equivalentReps} reps
                </p>
              {/if}
            </div>
          {/each}
        </div>
        {@render actionButton(
          'Complete Session',
          completeSession,
          'mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 w-full',
        )}
      </div>
    {:else}
      <div class="text-center text-lg text-gray-300">
        {#if Object.keys(exercises).length === 0}
          <p>Add your first exercise above to get started!</p>
        {:else}
          <p>Please select an exercise from the dropdown above to view its program.</p>
        {/if}
      </div>
    {/if}

    <!-- Export/Import/Reset Section -->
    <div class="w-full rounded-lg bg-gray-700 p-5 shadow-lg">
      {@render sectionHeader('Export/Import Exercises', isExportImportExpanded, () => (isExportImportExpanded = !isExportImportExpanded))}
      {#if isExportImportExpanded}
        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {@render actionButton(
            'Export Exercises',
            exportExercises,
            'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 w-full sm:w-auto',
          )}
          <input type="file" accept="application/json" onchange={importExercises} class="hidden" id="import-exercises" />
          <label
            for="import-exercises"
            class="w-full transform cursor-pointer rounded-lg bg-gradient-to-r from-green-500 to-teal-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:from-green-600 hover:to-teal-700 sm:w-auto"
          >
            Import Exercises
          </label>
          {@render actionButton(
            'Reset All Data',
            resetAllData,
            'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 w-full sm:w-auto',
          )}
        </div>
      {/if}
    </div>
  </div>
</div>
