let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];


// 1. searchNotes()
// Returns notes whose text contains the given word, ignoring case.
function searchNotes(word) {
  return notes.filter(note =>
    note.text.toLowerCase().includes(word.toLowerCase())
  );
}

console.log(searchNotes("study"));
// Expected: []

console.log(searchNotes("the"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]


// 2. longestNote()
// Returns the note with the most characters, or null if there are no notes.
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

let savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;


// 3. countByCategory()
// Counts how many notes belong to each category.
function countByCategory() {
  let counts = {};

  for (let note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }

  return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

savedNotes = notes;
notes = [];

console.log(countByCategory());
// Expected: {}

notes = savedNotes;


// 4. getSummary()
// Returns a sentence summarizing the number of notes in each category.
function getSummary() {
  let counts = countByCategory();
  let total = notes.length;
  let word = total === 1 ? "note" : "notes";

  return `${total} ${word}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

savedNotes = notes;
notes = [];

console.log(getSummary());
// Expected: "0 notes: 0 personal, 0 work, 0 study."

notes = savedNotes;


// 5. isDuplicate()
// Checks whether a note with the same text already exists,
// ignoring case and extra spaces.
function isDuplicate(text) {
  let cleanedText = text.trim().toLowerCase();

  return notes.some(note =>
    note.text.trim().toLowerCase() === cleanedText
  );
}

console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

console.log(isDuplicate("Go to the gym"));
// Expected: false


// 6. addNote()
// Adds a note only if:
// - text is 1–200 characters
// - it is not a duplicate
// - category is personal, work or study
function addNote(text, category) {
  if (text.trim().length < 1 || text.trim().length > 200) {
    console.log("Note not added: text must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Note not added: duplicate note.");
    return false;
  }

  if (!["personal", "work", "study"].includes(category)) {
    console.log("Note not added: invalid category.");
    return false;
  }

  let newNote = {
    id: notes.length + 1,
    text: text.trim(),
    category: category
  };

  notes.push(newNote);

  console.log("Note added successfully.");
  return true;
}

console.log(addNote("Buy milk and bread", "personal"));
// Expected: false

console.log(addNote("Complete JavaScript practice", "study"));
// Expected: true

console.log(addNote("", "study"));
// Expected: false

console.log(addNote("New work task", "invalid"));
// Expected: false