/* Dark mode - https://www.ditdot.hr/en/dark-mode-website-tutorial */

let darkModeState = false;

// MediaQueryList object
const useDark = window.matchMedia("(prefers-color-scheme: dark)");
const colorSchemeEvent = new Event("trigger-color-scheme");

// Toggles the "dark-mode" class
function toggleDarkMode(state) {
	document.documentElement.classList.toggle("dark-mode", state);
	darkModeState = state;
}

// Sets localStorage state
function setDarkModeLocalStorage(state) {
	localStorage.setItem("dark-mode", state);
}

// Initial setting
toggleDarkMode(localStorage.getItem("dark-mode") == "true");

// Listen for changes in the OS settings.
// Note: the arrow function shorthand works only in modern browsers,
// for older browsers define the function using the function keyword.
useDark.addListener((evt) => toggleDarkMode(evt.matches));

window.addEventListener('load', () => {
	// Toggles the "dark-mode" class on click and sets localStorage state
	const colorSchemeButton = document.querySelector(".toggle-color-scheme");
	colorSchemeButton.addEventListener("click", () => {
		darkModeState = !darkModeState;

		toggleDarkMode(darkModeState);
		setDarkModeLocalStorage(darkModeState);
		document.documentElement.dispatchEvent(colorSchemeEvent);
	});
});