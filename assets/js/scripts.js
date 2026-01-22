// Grab references to the body and button
const body = document.body;
const toggleButton = document.getElementById("modeToggle");

// Function to toggle light and dark mode
function toggleMode() {
  const isDarkMode = body.classList.contains("dark");
  if (isDarkMode) {
    body.classList.remove("dark");
    body.classList.add("light");
    toggleButton.textContent = "🌓";
    localStorage.setItem("theme", "light");
  } else {
    body.classList.remove("light");
    body.classList.add("dark");
    toggleButton.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  }
}

// Event listener for the button
toggleButton.addEventListener("click", toggleMode);

// Load the saved theme from localStorage
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  body.classList.remove("light");
  body.classList.add("dark");
  toggleButton.textContent = "☀️";
}
