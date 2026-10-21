
"use strict";

const form = document.getElementById("surveyForm");
const progressBar = document.getElementById("progressBar");
const progressTrack = document.getElementById("progressTrack");
const progressText = document.getElementById("progressText");
const topicCount = document.getElementById("topicCount");
const comments = document.getElementById("comments");
const charCount = document.getElementById("charCount");
const saveStatus = document.getElementById("saveStatus");
const successMessage = document.getElementById("successMessage");
const summary = document.getElementById("summary");
const themeToggle = document.getElementById("themeToggle");

const DRAFT_KEY = "learningSurveyDraft";
const THEME_KEY = "learningSurveyTheme";

const fields = ["name", "email", "age", "role"].map(
  id => document.getElementById(id)
);

function showError(id, message) {
  const field = document.getElementById(id);
  const error = document.getElementById(id + "Error");

  if (!field || !error) return;

  error.textContent = message;
  error.hidden = !message;
  field.classList.toggle("invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateField(field) {
  let message = "";

  if (field.validity.valueMissing) {
    message = "This field is required.";
  } else if (field.validity.typeMismatch) {
    message = "Enter a valid email address.";
  } else if (field.validity.tooShort) {
    message = "Please enter at least 2 characters.";
  } else if (
    field.validity.rangeUnderflow ||
    field.validity.rangeOverflow ||
    field.validity.stepMismatch
  ) {
    message = "Age must be a whole number between 10 and 100.";
  }

  if (field.id === "name" && !field.value.trim()) {
    message = "Please enter your name.";
  }

  showError(field.id, message);
  return !message;
}

function validateForm() {
  let valid = true;

  fields.forEach(field => {
    if (field.id === "age" && field.value === "") {
      showError("age", "");
      return;
    }

    if (!validateField(field)) valid = false;
  });

  const rating = form.querySelector('input[name="rating"]:checked');
  const ratingError = document.getElementById("ratingError");

  ratingError.textContent = rating
    ? ""
    : "Please select a learning experience rating.";

  ratingError.hidden = Boolean(rating);

  if (!rating) valid = false;

  return valid;
}

function getFormData() {
  const data = Object.fromEntries(new FormData(form).entries());

  data.topics = [
    ...form.querySelectorAll('input[name="topics"]:checked')
  ].map(input => input.value);

  return data;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getFormData()));
    saveStatus.textContent = "Draft saved on this device.";
  } catch {
    saveStatus.textContent = "Draft saving is unavailable.";
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return;
    }

    ["name", "email", "age", "role", "comments"].forEach(id => {
      const field = document.getElementById(id);

      if (typeof data[id] === "string") {
        field.value = data[id].slice(
          0,
          id === "comments" ? 2000 : 254
        );
      }
    });

    if (typeof data.rating === "string") {
      const radio = [...form.querySelectorAll('input[name="rating"]')]
        .find(input => input.value === data.rating);

      if (radio) radio.checked = true;
    }

    if (Array.isArray(data.topics)) {
      form.querySelectorAll('input[name="topics"]').forEach(input => {
        input.checked = data.topics.includes(input.value);
      });
    }
  } catch {
    saveStatus.textContent = "Unable to restore the saved draft.";
  }
}

function updateProgress() {
  const answered = [
    document.getElementById("name").value.trim() !== "",
    document.getElementById("email").value.trim() !== "",
    document.getElementById("age").value !== "",
    document.getElementById("role").value !== "",
    Boolean(form.querySelector('input[name="rating"]:checked')),
    form.querySelectorAll('input[name="topics"]:checked').length > 0,
    comments.value.trim() !== ""
  ].filter(Boolean).length;

  const percentage = Math.round(answered / 7 * 100);

  progressBar.style.width = percentage + "%";
  progressText.textContent = percentage + "% complete";
  progressTrack.setAttribute("aria-valuenow", percentage);

  const selectedTopics = form.querySelectorAll(
    'input[name="topics"]:checked'
  ).length;

  topicCount.textContent =
    selectedTopics + (
      selectedTopics === 1 ? " topic selected" : " topics selected"
    );

  charCount.textContent = comments.value.length;
}

function setTheme(dark) {
  document.body.classList.toggle("dark", dark);

  themeToggle.textContent = dark ? "☀️ Light mode" : "🌙 Dark mode";
  themeToggle.setAttribute("aria-pressed", String(dark));

  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Theme still works until the page is closed.
  }
}

themeToggle.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});

try {
  setTheme(localStorage.getItem(THEME_KEY) === "dark");
} catch {
  setTheme(false);
}

// Validate fields while typing and on leaving a field.
fields.forEach(field => {
  field.addEventListener("input", () => {
    if (field.dataset.touched) validateField(field);
    updateProgress();
    saveDraft();
  });

  field.addEventListener("blur", () => {
    field.dataset.touched = "true";
    validateField(field);
  });

  field.addEventListener("change", () => {
    updateProgress();
    saveDraft();
  });
});

form.addEventListener("input", event => {
  if (
    event.target.matches('input[name="topics"]') ||
    event.target.matches('input[name="rating"]') ||
    event.target === comments
  ) {
    updateProgress();
    saveDraft();
  }
});

form.addEventListener("change", event => {
  if (
    event.target.matches('input[name="topics"]') ||
    event.target.matches('input[name="rating"]') ||
    event.target === document.getElementById("role")
  ) {
    updateProgress();
    saveDraft();
  }
});

function addSummaryItem(label, value) {
  const item = document.createElement("li");
  item.textContent = label + ": " + value;
  summary.appendChild(item);
}

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!validateForm()) {
    const firstInvalid = form.querySelector('[aria-invalid="true"]');

    if (firstInvalid) {
      firstInvalid.focus();
    } else {
      document.querySelector('input[name="rating"]').focus();
    }

    return;
  }

  const data = getFormData();

  summary.replaceChildren();
  addSummaryItem("Name", data.name.trim());
  addSummaryItem("Role", data.role);
  addSummaryItem("Rating", data.rating);
  addSummaryItem(
    "Topics",
    data.topics.length ? data.topics.join(", ") : "None selected"
  );

  form.hidden = true;
  successMessage.hidden = false;

  progressBar.style.width = "100%";
  progressText.textContent = "100% complete";
  progressTrack.setAttribute("aria-valuenow", 100);

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Keep showing the confirmation.
  }

  successMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

document.getElementById("clearDraft").addEventListener("click", () => {
  if (!confirm("Are you sure you want to clear your answers?")) return;

  form.reset();

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // The visible form can still be reset.
  }

  fields.forEach(field => {
    delete field.dataset.touched;
    showError(field.id, "");
  });

  showError("age", "");
  document.getElementById("ratingError").hidden = true;

  updateProgress();
  saveStatus.textContent = "Your answers have been cleared.";
});

document.getElementById("newSurvey").addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  successMessage.hidden = true;

  fields.forEach(field => {
    delete field.dataset.touched;
    showError(field.id, "");
  });

  showError("age", "");
  document.getElementById("ratingError").hidden = true;

  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Initialize the page.
restoreDraft();
updateProgress();
