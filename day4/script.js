 const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

function updateCounts() {
    const text = noteText.value;
    const characterCount = text.length;

    const words = text.trim() === ""
        ? 0
        : text.trim().split(/\s+/).length;

    charCount.textContent = `${characterCount} / 200 characters`;
    wordCount.textContent = `${words} words`;

    charCount.classList.remove("warning", "over");

    if (characterCount > 200) {
        charCount.classList.add("over");
    } else if (characterCount > 180) {
        charCount.classList.add("warning");
    }
}

noteText.addEventListener("input", function () {
    updateCounts();
    localStorage.setItem("noteDraft", noteText.value);
});

clearBtn.addEventListener("click", function () {
    noteText.value = "";

    localStorage.removeItem("noteDraft");

    updateCounts();
});

noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        noteText.value = "";

        localStorage.removeItem("noteDraft");

        updateCounts();
    }
});

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
        localStorage.setItem("theme", "dark");
    } else {
        themeToggle.textContent = "Dark mode";
        localStorage.setItem("theme", "light");
    }
});

const savedDraft = localStorage.getItem("noteDraft");

if (savedDraft !== null) {
    noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
} else {
    themeToggle.textContent = "Dark mode";
}

updateCounts();