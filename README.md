REFLECTIONS

1. AI saved time by

AI saved me time by producing the code and allowing me to only really have to go back and debug. not a large amount of mistakes were made. 

2. At least one AI bug you identified and how you fixed it.

javascript was stopping halfway through and missing curly braces causing incomplete functions
The code kept stopping near the very bottom

3. A code snippet you refactored for clarity.

function toggleFlip() {
  appState.ui.isFlipped = !appState.ui.isFlipped;
  cardInnerElement.classList.toggle("is-flipped", appState.ui.isFlipped);
  updateCardAriaLabel();
  saveAppState();
}

4. One accessibility improvement you added.

I made most of the project accesible cause thats something im good at. 
I made a focus trap with that gives you the ability to use your keyboard for most of the app and a esc button press will take you out of that

5. What prompt changes improved AI output.

Being exact and specifying what i want AI to do exactly