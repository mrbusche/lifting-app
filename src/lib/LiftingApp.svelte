<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment'; // Import 'browser' from SvelteKit's environment module

  // Define the structure and rules for each lifting phase
  const phases = {
    'Base Phase': {
      sets: 3,
      repsPerSet: 10,
      percentages: [65, 70, 75],
      sessions: 4,
      progression: [
        { repsRange: [8, 9], change: 0, text: '8-9 reps: No change' },
        { repsRange: [6, 7], change: -5, text: '6-7 reps: Decrease 5 pounds' },
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
        { repsRange: [7, 7], change: 0, text: '7 reps: No change' },
        { repsRange: [5, 6], change: -5, text: '5-6 reps: Decrease 5 pounds' },
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
        { repsRange: [5, 5], change: 0, text: '5 reps: No change' },
        { repsRange: [3, 4], change: -5, text: '3-4 reps: Decrease 5 pounds' },
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
        { repsRange: [2, 2], change: 0, text: '2 reps: No change' },
        { repsRange: [1, 1], change: -5, text: '1 rep: Decrease 5 pounds' },
        { repsRange: [3, 3], change: 5, text: '3 reps: Increase 5 pounds' },
        { repsRange: [4, Infinity], change: 10, text: '4+ reps: Increase 10 pounds' },
      ],
    },
  };

  // State variables
  let exercises = {};
  let selectedExerciseName = null;
  let newExerciseName = '';
  let newExerciseMaxWeight = '';
  let completionMessage = '';
  let showCompletionMessage = false;

  // Derived state: These reactive declarations only read from other state variables,
  // ensuring they don't cause circular updates.
  $: currentExerciseData = selectedExerciseName ? exercises[selectedExerciseName] : null;
  $: currentPhase = currentExerciseData ? phases[currentExerciseData.currentPhaseName] : null;
  $: phaseNames = Object.keys(phases);
  $: currentPhaseIndex = currentExerciseData ? phaseNames.indexOf(currentExerciseData.currentPhaseName) : -1;

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
            // Ensure repsCompleted arrays are parsed back from JSON strings
            if (exercise.repsCompleted && typeof exercise.repsCompleted === 'string') {
              exercise.repsCompleted = JSON.parse(exercise.repsCompleted);
            } else {
              // If it's not a string or missing, ensure it's an array
              exercise.repsCompleted = exercise.repsCompleted || [];
            }

            // Now, ensure repsCompleted has the correct length for its current phase
            const phase = phases[exercise.currentPhaseName];
            if (phase && exercise.repsCompleted.length !== phase.sets) {
              exercise.repsCompleted = Array(phase.sets).fill('');
            }
          }
          exercises = parsedExercises; // Directly assign to make it reactive
          // Set selectedExerciseName after exercises are loaded
          if (!selectedExerciseName && Object.keys(exercises).length > 0) {
            selectedExerciseName = Object.keys(exercises)[0];
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
  // Svelte reactive statement: runs whenever 'exercises' changes
  $: {
    if (browser) {
      // Only run in the browser
      try {
        // Prepare data for saving: stringify repsCompleted arrays
        const exercisesToSave = {};
        for (const key in exercises) {
          exercisesToSave[key] = {
            ...exercises[key],
            repsCompleted: JSON.stringify(exercises[key].repsCompleted),
          };
        }
        localStorage.setItem('liftingTrackerExercises', JSON.stringify(exercisesToSave));
      } catch (error) {
        console.error('Error saving exercises to local storage:', error);
        completionMessage = 'Failed to save progress. Local storage might be full or inaccessible.';
        showCompletionMessage = true;
      }
    }
  }

  // Function to handle adding a new exercise
  function handleAddExercise() {
    const weight = parseFloat(newExerciseMaxWeight);
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
    if (exercises[newExerciseName.trim()]) {
      completionMessage = `An exercise named "${newExerciseName.trim()}" already exists. Please choose a different name.`;
      showCompletionMessage = true;
      return;
    }

    const newExerciseData = {
      maxWeight: weight,
      currentPhaseName: 'Base Phase',
      currentSessionIndex: 0,
      repsCompleted: Array(phases['Base Phase'].sets).fill(''), // Initialize reps for the new exercise
    };

    exercises = {
      ...exercises,
      [newExerciseName.trim()]: newExerciseData,
    };
    selectedExerciseName = newExerciseName.trim();
    newExerciseName = '';
    newExerciseMaxWeight = '';
    completionMessage = 'Exercise added successfully!';
    showCompletionMessage = true;
  }

  // Function to calculate the target weight for a given percentage, rounded to the nearest 5 lbs
  function calculateWeight(percentage) {
    if (!currentExerciseData) return 0;
    const rawWeight = currentExerciseData.maxWeight * (percentage / 100);
    // Round to the nearest 5 pounds
    return Math.round(rawWeight / 5) * 5;
  }

  // Function to handle changes in reps completed input for a specific set
  function handleRepsChange(index, value) {
    if (!selectedExerciseName) return;
    // Create a copy of the repsCompleted array to ensure Svelte detects the change
    const newReps = [...exercises[selectedExerciseName].repsCompleted];
    newReps[index] = value;
    // Update the exercises object immutably to trigger reactivity
    exercises = {
      ...exercises,
      [selectedExerciseName]: {
        ...exercises[selectedExerciseName],
        repsCompleted: newReps,
      },
    };
  }

  // Function to calculate the next max weight based on the last set's performance
  function calculateNextMaxWeight() {
    if (!currentExerciseData || !currentPhase) return currentExerciseData.maxWeight;

    const lastSetReps = parseInt(currentExerciseData.repsCompleted[currentExerciseData.repsCompleted.length - 1]);
    if (isNaN(lastSetReps)) {
      completionMessage = 'Please enter reps completed for all sets before completing the session.';
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
    // Ensure the new max weight is also rounded to the nearest 5 pounds
    return Math.round((currentExerciseData.maxWeight + weightChange) / 5) * 5;
  }

  // Function to complete the current session
  function completeSession() {
    if (!selectedExerciseName || !currentExerciseData || !currentPhase) return;

    // Check if all reps are entered
    const allRepsEntered = currentExerciseData.repsCompleted.every((reps) => reps !== '' && !isNaN(parseInt(reps)));
    if (!allRepsEntered) {
      completionMessage = 'Please enter reps completed for all sets before completing the session.';
      showCompletionMessage = true;
      return;
    }

    const newMaxWeight = calculateNextMaxWeight();

    // Create an updated copy of the current exercise data
    const updatedExercise = { ...exercises[selectedExerciseName] };
    updatedExercise.maxWeight = newMaxWeight;

    // Determine if phase or session changes
    if (updatedExercise.currentSessionIndex === currentPhase.sessions - 1) {
      completionMessage = `Phase "${updatedExercise.currentPhaseName}" completed for ${selectedExerciseName}! Your new max weight for the next phase is ${newMaxWeight} lbs.`;
      showCompletionMessage = true;
      updatedExercise.currentSessionIndex = 0; // Reset session index for the next phase
    } else {
      completionMessage = `Session ${updatedExercise.currentSessionIndex + 1} completed for ${selectedExerciseName}! Your new max weight for the next session is ${newMaxWeight} lbs.`;
      showCompletionMessage = true;
      updatedExercise.currentSessionIndex += 1; // Move to the next session
    }
    // Reset reps completed for the next session/phase explicitly
    updatedExercise.repsCompleted = Array(currentPhase.sets).fill('');

    // Update the exercises object immutably to trigger reactivity
    exercises = {
      ...exercises,
      [selectedExerciseName]: updatedExercise,
    };
  }

  // Function to move to the next phase
  function goToNextPhase() {
    if (!selectedExerciseName || !currentExerciseData) return;

    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < phaseNames.length) {
      // Update the exercises object immutably to trigger reactivity
      exercises = {
        ...exercises,
        [selectedExerciseName]: {
          ...exercises[selectedExerciseName],
          currentPhaseName: phaseNames[nextPhaseIndex],
          currentSessionIndex: 0, // Reset session index for the new phase
          repsCompleted: Array(phases[phaseNames[nextPhaseIndex]].sets).fill(''), // Reset reps for new phase
        },
      };
      completionMessage = ''; // Clear messages
      showCompletionMessage = false;
    } else {
      completionMessage = 'Congratulations! You have completed all phases of the program for this exercise!';
      showCompletionMessage = true;
    }
  }

  // Function to go back to the previous phase
  function goToPreviousPhase() {
    if (!selectedExerciseName || !currentExerciseData) return;

    const prevPhaseIndex = currentPhaseIndex - 1;
    if (prevPhaseIndex >= 0) {
      // Update the exercises object immutably to trigger reactivity
      exercises = {
        ...exercises,
        [selectedExerciseName]: {
          ...exercises[selectedExerciseName],
          currentPhaseName: phaseNames[prevPhaseIndex],
          currentSessionIndex: 0, // Reset session index for the new phase
          repsCompleted: Array(phases[phaseNames[prevPhaseIndex]].sets).fill(''), // Reset reps for new phase
        },
      };
      completionMessage = ''; // Clear messages
      showCompletionMessage = false;
    } else {
      completionMessage = 'You are already in the first phase for this exercise.';
      showCompletionMessage = true;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white font-inter flex flex-col items-center p-4 sm:p-6 md:p-8">
  <div class="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-4xl flex flex-col items-center">
    <h1
      class="text-4xl sm:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center"
    >
      Lifting Program Tracker
    </h1>

    <!-- Exercise Management Section -->
    <div class="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
      <h2 class="text-2xl font-bold text-yellow-300 mb-4 text-center">Manage Exercises</h2>

      <!-- Add New Exercise -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center">
        <input
          type="text"
          bind:value={newExerciseName}
          placeholder="New Exercise Name (e.g., Bench Press)"
          class="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-1/2"
        />
        <input
          type="number"
          bind:value={newExerciseMaxWeight}
          placeholder="Initial Max Weight (lbs)"
          class="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-1/4 text-center"
        />
        <button
          on:click={handleAddExercise}
          class="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-teal-700 transition duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto"
        >
          Add Exercise
        </button>
      </div>

      <!-- Select Existing Exercise -->
      {#if Object.keys(exercises).length > 0}
        <div class="text-center">
          <label for="exercise-select" class="text-lg text-gray-200 mr-3">Select Exercise:</label>
          <select
            id="exercise-select"
            bind:value={selectedExerciseName}
            class="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
      <div class="bg-blue-600 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-6 w-full text-center shadow-md">
        <p class="text-lg font-medium">{completionMessage}</p>
      </div>
    {/if}

    <!-- Main Program Display (after selecting an exercise) -->
    {#if selectedExerciseName && currentExerciseData && currentPhase}
      <div class="bg-gray-700 rounded-lg p-4 mb-6 w-full text-center shadow-inner">
        <p class="text-lg sm:text-xl font-semibold">
          Current Max Weight for {selectedExerciseName}: <span class="text-yellow-400">{currentExerciseData.maxWeight} lbs</span>
        </p>
      </div>

      <div class="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
        <h2 class="text-3xl font-bold mb-3 text-purple-300 text-center">
          {currentExerciseData.currentPhaseName}
        </h2>
        <p class="text-lg text-gray-300 text-center mb-4">
          Session {currentExerciseData.currentSessionIndex + 1} of {currentPhase.sessions}
        </p>

        <!-- Phase Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-200">
          <div>
            <h3 class="text-xl font-semibold text-pink-400 mb-2">Workout Details:</h3>
            {#if currentExerciseData.currentPhaseName !== 'Peak Phase'}
              <p>Sets: {currentPhase.sets}</p>
            {:else}
              <p>Sets: {currentPhase.sets} (Varying Reps/Percentages)</p>
            {/if}
            {#if currentExerciseData.currentPhaseName !== 'Peak Phase'}
              <p>Reps per Set: {currentPhase.repsPerSet}</p>
            {/if}
            <p>Percentages of Max:</p>
            <ul class="list-disc list-inside ml-4">
              {#each currentPhase.percentages as pct, index}
                <li>Set {index + 1}: {pct}% (Target: {calculateWeight(pct)} lbs)</li>
              {/each}
            </ul>
          </div>

          <!-- Progression Rules -->
          <div>
            <h3 class="text-xl font-semibold text-pink-400 mb-2">Progression Rules (Based on Last Set):</h3>
            <ul class="list-disc list-inside ml-4">
              {#each currentPhase.progression as rule, index}
                <li>{rule.text}</li>
              {/each}
            </ul>
          </div>
        </div>
      </div>

      <!-- Reps Input for Current Session -->
      <div class="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
        <h3 class="text-2xl font-bold text-green-400 mb-4 text-center">
          Enter Reps Completed for Session {currentExerciseData.currentSessionIndex + 1}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each Array(currentPhase.sets) as _, index}
            <div class="flex flex-col items-center">
              <label for="set-{index}" class="text-lg mb-2 text-gray-200">
                Set {index + 1} (Target: {currentExerciseData.currentPhaseName === 'Peak Phase'
                  ? currentPhase.repsPerSet[index]
                  : currentPhase.repsPerSet} reps)
              </label>
              <input
                id="set-{index}"
                type="number"
                bind:value={currentExerciseData.repsCompleted[index]}
                placeholder="Reps done"
                class="p-2 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 w-24 text-center"
              />
            </div>
          {/each}
        </div>
        <button
          on:click={completeSession}
          class="mt-8 px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 transition duration-300 ease-in-out transform hover:scale-105 w-full"
        >
          Complete Session
        </button>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex flex-wrap justify-center gap-4 w-full">
        <button
          on:click={goToPreviousPhase}
          disabled={currentPhaseIndex === 0}
          class={`px-6 py-3 rounded-lg font-semibold shadow-lg transition duration-300 ease-in-out transform hover:scale-105
            ${currentPhaseIndex === 0 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'}`}
        >
          Previous Phase
        </button>
        <button
          on:click={goToNextPhase}
          disabled={currentPhaseIndex === phaseNames.length - 1 && currentExerciseData.currentSessionIndex === currentPhase.sessions - 1}
          class={`px-6 py-3 rounded-lg font-semibold shadow-lg transition duration-300 ease-in-out transform hover:scale-105
            ${currentPhaseIndex === phaseNames.length - 1 && currentExerciseData.currentSessionIndex === currentPhase.sessions - 1 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'}`}
        >
          Next Phase
        </button>
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
  </div>
</div>
