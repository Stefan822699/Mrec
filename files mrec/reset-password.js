const form = document.querySelector("#reset-form");
const subtitle = document.querySelector("#reset-subtitle");
const message = document.querySelector("#reset-message");
const newPass = document.querySelector("#new-password");
const confirmPass = document.querySelector("#confirm-password");

let formShown = false;

function showResetForm() {
  if (formShown) return;
  formShown = true;
  subtitle.textContent = "Choose a new password for your account";
  form.classList.remove("hidden");
}
function showInvalid() {
  if (formShown) return;
  subtitle.textContent = "This reset link is invalid or has expired. Go back and request a new one.";
}
function setNote(text, isError) {
  message.textContent = text;
  message.classList.toggle("error-note", Boolean(isError));
}
function setFieldError(input, text) {
  input.classList.toggle("invalid", Boolean(text));
  document.getElementById(`${input.id}-error`).textContent = text;
}

// Supabase reads the reset token from the link and fires PASSWORD_RECOVERY
db.auth.onAuthStateChange(event => {
  if (event === "PASSWORD_RECOVERY") showResetForm();
});

setTimeout(async () => {
  if (formShown) return;
  if (/error/i.test(window.location.hash)) return showInvalid();
  const { data: { session } } = await db.auth.getSession();
  if (session) showResetForm(); else showInvalid();
}, 1500);

form.addEventListener("submit", async event => {
  event.preventDefault();
  let hasError = false;

  if (newPass.value.length < 8) {
    setFieldError(newPass, "Password must be at least 8 characters.");
    hasError = true;
  } else setFieldError(newPass, "");

  if (confirmPass.value !== newPass.value) {
    setFieldError(confirmPass, "Passwords do not match.");
    hasError = true;
  } else setFieldError(confirmPass, "");

  if (hasError) return;

  const button = form.querySelector(".primary-button");
  button.disabled = true;
  setNote("Updating password...", false);

  const { error } = await db.auth.updateUser({ password: newPass.value });
  button.disabled = false;
  if (error) return setNote(error.message, true);

  setNote("Password updated! Taking you to log in...", false);
  await db.auth.signOut();
  setTimeout(() => (window.location.href = "index.html"), 1800);
});
