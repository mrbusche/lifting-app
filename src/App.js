import React, { useState, useEffect, useCallback } from 'react';

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

// Main App component
function App() {
  // State to store all exercises and their data
  // exercises: { [exerciseName]: { maxWeight, currentPhaseName, currentSessionIndex, repsCompleted } }
  const [exercises, setExercises] = useState({});
  // State for the currently selected exercise name
  const [selectedExerciseName, setSelectedExerciseName] = useState(null);
  // State for input fields when adding a new exercise
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMaxWeight, setNewExerciseMaxWeight] = useState('');

  // State for displaying messages to the user
  const [completionMessage, setCompletionMessage] = useState('');
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Derived state for the currently selected exercise's data
  const currentExerciseData = selectedExerciseName ? exercises[selectedExerciseName] : null;
  const currentPhase = currentExerciseData ? phases[currentExerciseData.currentPhaseName] : null;
  const phaseNames = Object.keys(phases);
  const currentPhaseIndex = currentExerciseData ? phaseNames.indexOf(currentExerciseData.currentPhaseName) : -1;

  // --- Load Exercises from Local Storage on initial mount ---
  useEffect(() => {
    try {
      const storedExercises = localStorage.getItem('liftingTrackerExercises');
      if (storedExercises) {
        const parsedExercises = JSON.parse(storedExercises);
        // Ensure repsCompleted arrays are parsed back from JSON strings
        for (const key in parsedExercises) {
          if (parsedExercises[key].repsCompleted && typeof parsedExercises[key].repsCompleted === 'string') {
            parsedExercises[key].repsCompleted = JSON.parse(parsedExercises[key].repsCompleted);
          }
        }
        setExercises(parsedExercises);
        // If no exercise is selected, select the first one if available
        if (!selectedExerciseName && Object.keys(parsedExercises).length > 0) {
          setSelectedExerciseName(Object.keys(parsedExercises)[0]);
        }
      }
    } catch (error) {
      console.error('Error loading exercises from local storage:', error);
      setCompletionMessage('Failed to load saved exercises. Local storage might be corrupted.');
      setShowCompletionMessage(true);
    }
  }, []); // Run once on component mount

  // --- Save Exercises to Local Storage whenever 'exercises' state changes ---
  useEffect(() => {
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
      setCompletionMessage('Failed to save progress. Local storage might be full or inaccessible.');
      setShowCompletionMessage(true);
    }
  }, [exercises]); // Save whenever exercises state changes

  // Effect to initialize repsCompleted when the selected exercise or its phase/session changes
  useEffect(() => {
    if (currentPhase && currentExerciseData && selectedExerciseName) {
      // Initialize repsCompleted with empty strings for each set of the current phase
      // This ensures the input fields are reset correctly when switching exercises or sessions
      setExercises((prevExercises) => {
        const currentReps = prevExercises[selectedExerciseName]?.repsCompleted || [];
        // Only update if the length or content is different to prevent infinite loops
        if (currentReps.length !== currentPhase.sets || currentReps.some((r) => r !== '')) {
          return {
            ...prevExercises,
            [selectedExerciseName]: {
              ...prevExercises[selectedExerciseName],
              repsCompleted: Array(currentPhase.sets).fill(''),
            },
          };
        }
        return prevExercises;
      });
    }
  }, [currentPhase, currentExerciseData?.currentSessionIndex, selectedExerciseName]);

  // Function to handle adding a new exercise
  const handleAddExercise = () => {
    const weight = parseFloat(newExerciseMaxWeight);
    if (!newExerciseName.trim()) {
      setCompletionMessage('Please enter a name for the exercise.');
      setShowCompletionMessage(true);
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      setCompletionMessage('Please enter a valid positive number for the max weight.');
      setShowCompletionMessage(true);
      return;
    }
    if (exercises[newExerciseName.trim()]) {
      setCompletionMessage(`An exercise named "${newExerciseName.trim()}" already exists. Please choose a different name.`);
      setShowCompletionMessage(true);
      return;
    }

    const newExerciseData = {
      maxWeight: weight,
      currentPhaseName: 'Base Phase',
      currentSessionIndex: 0,
      repsCompleted: Array(phases['Base Phase'].sets).fill(''), // Stored as array in state
    };

    setExercises((prevExercises) => ({
      ...prevExercises,
      [newExerciseName.trim()]: newExerciseData,
    }));
    setSelectedExerciseName(newExerciseName.trim());
    setNewExerciseName('');
    setNewExerciseMaxWeight('');
    setCompletionMessage('Exercise added successfully!');
    setShowCompletionMessage(true);
  };

  // Function to calculate the target weight for a given percentage, rounded to the nearest 5 lbs
  const calculateWeight = useCallback(
    (percentage) => {
      if (!currentExerciseData) return 0;
      const rawWeight = currentExerciseData.maxWeight * (percentage / 100);
      // Round to the nearest 5 pounds
      return Math.round(rawWeight / 5) * 5;
    },
    [currentExerciseData],
  );

  // Function to handle changes in reps completed input for a specific set
  const handleRepsChange = (index, value) => {
    if (!selectedExerciseName) return;
    setExercises((prevExercises) => {
      const newReps = [...prevExercises[selectedExerciseName].repsCompleted];
      newReps[index] = value;
      return {
        ...prevExercises,
        [selectedExerciseName]: {
          ...prevExercises[selectedExerciseName],
          repsCompleted: newReps,
        },
      };
    });
  };

  // Function to calculate the next max weight based on the last set's performance
  const calculateNextMaxWeight = useCallback(() => {
    if (!currentExerciseData || !currentPhase) return currentExerciseData.maxWeight;

    const lastSetReps = parseInt(currentExerciseData.repsCompleted[currentExerciseData.repsCompleted.length - 1]);
    if (isNaN(lastSetReps)) {
      setCompletionMessage('Please enter reps completed for all sets before completing the session.');
      setShowCompletionMessage(true);
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
  }, [currentExerciseData, currentPhase]);

  // Function to complete the current session
  const completeSession = () => {
    if (!selectedExerciseName || !currentExerciseData || !currentPhase) return;

    // Check if all reps are entered
    const allRepsEntered = currentExerciseData.repsCompleted.every((reps) => reps !== '' && !isNaN(parseInt(reps)));
    if (!allRepsEntered) {
      setCompletionMessage('Please enter reps completed for all sets before completing the session.');
      setShowCompletionMessage(true);
      return;
    }

    const newMaxWeight = calculateNextMaxWeight();

    setExercises((prevExercises) => {
      const updatedExercise = { ...prevExercises[selectedExerciseName] };
      updatedExercise.maxWeight = newMaxWeight;

      // Check if it's the last session of the current phase
      if (updatedExercise.currentSessionIndex === currentPhase.sessions - 1) {
        setCompletionMessage(
          `Phase "${updatedExercise.currentPhaseName}" completed for ${selectedExerciseName}! Your new max weight for the next phase is ${newMaxWeight} lbs.`,
        );
        setShowCompletionMessage(true);
        // Reset session index for the next phase, but don't advance phase yet
        updatedExercise.currentSessionIndex = 0;
      } else {
        setCompletionMessage(
          `Session ${
            updatedExercise.currentSessionIndex + 1
          } completed for ${selectedExerciseName}! Your new max weight for the next session is ${newMaxWeight} lbs.`,
        );
        setShowCompletionMessage(true);
        updatedExercise.currentSessionIndex += 1; // Move to the next session
      }
      // Reset reps completed for the next session/phase
      updatedExercise.repsCompleted = Array(currentPhase.sets).fill('');

      return {
        ...prevExercises,
        [selectedExerciseName]: updatedExercise,
      };
    });
  };

  // Function to move to the next phase
  const goToNextPhase = () => {
    if (!selectedExerciseName || !currentExerciseData) return;

    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < phaseNames.length) {
      setExercises((prevExercises) => ({
        ...prevExercises,
        [selectedExerciseName]: {
          ...prevExercises[selectedExerciseName],
          currentPhaseName: phaseNames[nextPhaseIndex],
          currentSessionIndex: 0, // Reset session index for the new phase
          repsCompleted: Array(phases[phaseNames[nextPhaseIndex]].sets).fill(''), // Reset reps for new phase
        },
      }));
      setCompletionMessage(''); // Clear messages
      setShowCompletionMessage(false);
    } else {
      setCompletionMessage('Congratulations! You have completed all phases of the program for this exercise!');
      setShowCompletionMessage(true);
    }
  };

  // Function to go back to the previous phase
  const goToPreviousPhase = () => {
    if (!selectedExerciseName || !currentExerciseData) return;

    const prevPhaseIndex = currentPhaseIndex - 1;
    if (prevPhaseIndex >= 0) {
      setExercises((prevExercises) => ({
        ...prevExercises,
        [selectedExerciseName]: {
          ...prevExercises[selectedExerciseName],
          currentPhaseName: phaseNames[prevPhaseIndex],
          currentSessionIndex: 0, // Reset session index for the new phase
          repsCompleted: Array(phases[phaseNames[prevPhaseIndex]].sets).fill(''), // Reset reps for new phase
        },
      }));
      setCompletionMessage(''); // Clear messages
      setShowCompletionMessage(false);
    } else {
      setCompletionMessage('You are already in the first phase for this exercise.');
      setShowCompletionMessage(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white font-inter flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center">
          Lifting Program Tracker
        </h1>

        {/* Exercise Management Section */}
        <div className="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
          <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">Manage Exercises</h2>

          {/* Add New Exercise */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center">
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              placeholder="New Exercise Name (e.g., Bench Press)"
              className="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-1/2"
            />
            <input
              type="number"
              value={newExerciseMaxWeight}
              onChange={(e) => setNewExerciseMaxWeight(e.target.value)}
              placeholder="Initial Max Weight (lbs)"
              className="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-1/4 text-center"
            />
            <button
              onClick={handleAddExercise}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-teal-700 transition duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto"
            >
              Add Exercise
            </button>
          </div>

          {/* Select Existing Exercise */}
          {Object.keys(exercises).length > 0 && (
            <div className="text-center">
              <label htmlFor="exercise-select" className="text-lg text-gray-200 mr-3">
                Select Exercise:
              </label>
              <select
                id="exercise-select"
                value={selectedExerciseName || ''}
                onChange={(e) => setSelectedExerciseName(e.target.value)}
                className="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="" disabled>
                  -- Choose an Exercise --
                </option>
                {Object.keys(exercises).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Completion Message Display */}
        {showCompletionMessage && (
          <div className="bg-blue-600 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-6 w-full text-center shadow-md">
            <p className="text-lg font-medium">{completionMessage}</p>
          </div>
        )}

        {/* Main Program Display (after selecting an exercise) */}
        {selectedExerciseName && currentExerciseData && currentPhase ? (
          <>
            <div className="bg-gray-700 rounded-lg p-4 mb-6 w-full text-center shadow-inner">
              <p className="text-lg sm:text-xl font-semibold">
                Current Max Weight for {selectedExerciseName}: <span className="text-yellow-400">{currentExerciseData.maxWeight} lbs</span>
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
              <h2 className="text-3xl font-bold mb-3 text-purple-300 text-center">{currentExerciseData.currentPhaseName}</h2>
              <p className="text-lg text-gray-300 text-center mb-4">
                Session {currentExerciseData.currentSessionIndex + 1} of {currentPhase.sessions}
              </p>

              {/* Phase Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-pink-400 mb-2">Workout Details:</h3>
                  {currentExerciseData.currentPhaseName !== 'Peak Phase' ? (
                    <p>Sets: {currentPhase.sets}</p>
                  ) : (
                    <p>Sets: {currentPhase.sets} (Varying Reps/Percentages)</p>
                  )}
                  {currentExerciseData.currentPhaseName !== 'Peak Phase' && <p>Reps per Set: {currentPhase.repsPerSet}</p>}
                  <p>Percentages of Max:</p>
                  <ul className="list-disc list-inside ml-4">
                    {currentPhase.percentages.map((pct, index) => (
                      <li key={index}>
                        Set {index + 1}: {pct}% (Target: {calculateWeight(pct)} lbs)
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progression Rules */}
                <div>
                  <h3 className="text-xl font-semibold text-pink-400 mb-2">Progression Rules (Based on Last Set):</h3>
                  <ul className="list-disc list-inside ml-4">
                    {currentPhase.progression.map((rule, index) => (
                      <li key={index}>{rule.text}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Reps Input for Current Session */}
            <div className="bg-gray-700 rounded-lg p-5 mb-6 w-full shadow-lg">
              <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">
                Enter Reps Completed for Session {currentExerciseData.currentSessionIndex + 1}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: currentPhase.sets }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <label htmlFor={`set-${index}`} className="text-lg mb-2 text-gray-200">
                      Set {index + 1} (Target:{' '}
                      {currentExerciseData.currentPhaseName === 'Peak Phase' ? currentPhase.repsPerSet[index] : currentPhase.repsPerSet}{' '}
                      reps)
                    </label>
                    <input
                      id={`set-${index}`}
                      type="number"
                      value={currentExerciseData.repsCompleted[index]}
                      onChange={(e) => handleRepsChange(index, e.target.value)}
                      placeholder="Reps done"
                      className="p-2 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 w-24 text-center"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={completeSession}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 transition duration-300 ease-in-out transform hover:scale-105 w-full"
              >
                Complete Session
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap justify-center gap-4 w-full">
              <button
                onClick={goToPreviousPhase}
                disabled={currentPhaseIndex === 0}
                className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition duration-300 ease-in-out transform hover:scale-105
                  ${
                    currentPhaseIndex === 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                  }`}
              >
                Previous Phase
              </button>
              <button
                onClick={goToNextPhase}
                disabled={
                  currentPhaseIndex === phaseNames.length - 1 && currentExerciseData.currentSessionIndex === currentPhase.sessions - 1
                }
                className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition duration-300 ease-in-out transform hover:scale-105
                  ${
                    currentPhaseIndex === phaseNames.length - 1 && currentExerciseData.currentSessionIndex === currentPhase.sessions - 1
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'
                  }`}
              >
                Next Phase
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-lg text-gray-300">
            {Object.keys(exercises).length === 0 ? (
              <p>Add your first exercise above to get started!</p>
            ) : (
              <p>Please select an exercise from the dropdown above to view its program.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
