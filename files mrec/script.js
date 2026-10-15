const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const forgotForm = document.querySelector("#forgot-form");
const title = document.querySelector("#form-title");
const subtitle = document.querySelector("#form-subtitle");

function showForm(which) {
  loginForm.classList.toggle("hidden", which !== "login");
  signupForm.classList.toggle("hidden", which !== "signup");
  forgotForm.classList.toggle("hidden", which !== "forgot");
  const text = {
    login:  ["Welcome back", "Log-in to access your account"],
    signup: ["Sign-up Form", "Sign-up to create an account"],
    forgot: ["Reset password", "Enter your email and we'll send you a reset link"]
  }[which];
  title.textContent = text[0];
  subtitle.textContent = text[1];
  clearFormMessages();
}
document.querySelector("#show-signup").addEventListener("click", () => showForm("signup"));
document.querySelector("#show-login").addEventListener("click", () => showForm("login"));
document.querySelector("#forgot-link").addEventListener("click", event => {
  event.preventDefault();
  showForm("forgot");
});
document.querySelector("#back-to-login").addEventListener("click", () => showForm("login"));

function setError(input, message) {
  input.classList.toggle("invalid", Boolean(message));
  input.classList.toggle("valid", !message && input.value.trim().length > 0);
  const error = document.getElementById(`${input.id}-error`);
  if (error) error.textContent = message;
}
function clearFormMessages() {
  document.querySelectorAll(".error").forEach(el => el.textContent = "");
  document.querySelectorAll("input").forEach(el => el.classList.remove("invalid", "valid"));
  document.querySelectorAll(".form-note").forEach(el => el.textContent = "");
}
function validateUsername(input) {
  const value = input.value.trim();
  if (!value) return "Username is required.";
  if (value.length < 3 || value.length > 24) return "Username must be 3–24 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Use only letters, numbers, and underscores.";
  return "";
}
function validatePassword(input) {
  const value = input.value;
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}
function validateEmail(input) {
  const value = input.value.trim();
  if (!value) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Enter a valid email address.";
  return "";
}
function validatePhone(input) {
  const value = input.value.trim();
  if (!value) return "Phone number is required.";
  if (!/^\+?[0-9\s()-]+$/.test(value)) return "Use digits only, with an optional leading +.";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "Phone number must contain 10–15 digits.";
  return "";
}
function attachLiveValidation(form, validators) {
  Object.entries(validators).forEach(([id, validator]) => {
    const input = document.getElementById(id);
    input.addEventListener("blur", () => setError(input, validator(input)));
    input.addEventListener("input", () => {
      if (input.classList.contains("invalid") || input.classList.contains("valid")) {
        setError(input, validator(input));
      }
    });
  });
}
attachLiveValidation(loginForm, {
  "login-email": validateEmail,
  "login-password": validatePassword
});
attachLiveValidation(signupForm, {
  "signup-username": validateUsername,
  "signup-password": validatePassword,
  "signup-email": validateEmail,
  "signup-phone": validatePhone
});

// If already logged in, skip the login page
db.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.replace("dashboard.html");
});

function setNote(el, message, isError) {
  el.textContent = message;
  el.classList.toggle("error-note", Boolean(isError));
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#login-email");
  const password = document.querySelector("#login-password");
  const note = document.querySelector("#form-message");
  const errors = [
    [email, validateEmail(email)],
    [password, validatePassword(password)]
  ];
  errors.forEach(([input, message]) => setError(input, message));
  if (errors.some(([, message]) => message)) return;

  const button = loginForm.querySelector(".primary-button");
  button.disabled = true;
  setNote(note, "Logging in...", false);

  const { error } = await db.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  });
  button.disabled = false;

  if (error) {
    const wrongLogin = /invalid login credentials/i.test(error.message);
    if (wrongLogin) {
      [email, password].forEach(input => {
        input.classList.remove("valid");
        input.classList.add("invalid");
      });
    }
    return setNote(note, wrongLogin ? "Incorrect email or password." : error.message, true);
  }
  window.location.href = "dashboard.html";
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  const fields = [
    ["signup-username", validateUsername],
    ["signup-password", validatePassword],
    ["signup-email", validateEmail],
    ["signup-phone", validatePhone]
  ];
  let hasError = false;
  fields.forEach(([id, validator]) => {
    const input = document.getElementById(id);
    const message = validator(input);
    setError(input, message);
    if (message) hasError = true;
  });
  const terms = document.querySelector("#terms");
  document.querySelector("#terms-error").textContent = terms.checked ? "" : "Please accept the terms to continue.";
  if (!terms.checked) hasError = true;
  if (hasError) return;

  const note = document.querySelector("#signup-message");
  const button = signupForm.querySelector(".primary-button");
  button.disabled = true;
  setNote(note, "Creating your account...", false);

  const { data, error } = await db.auth.signUp({
    email: document.querySelector("#signup-email").value.trim(),
    password: document.querySelector("#signup-password").value,
    options: {
      data: {
        username: document.querySelector("#signup-username").value.trim(),
        phone: document.querySelector("#signup-phone").value.trim()
      }
    }
  });
  button.disabled = false;

  if (error) {
    const taken = /database error/i.test(error.message);
    return setNote(note, taken ? "That username or email is already taken." : error.message, true);
  }
  if (data.session) {
    window.location.href = "dashboard.html";   // email confirmation is off
  } else {
    setNote(note, "Account created! Check your email to confirm, then log in.", false);
  }
});


// ---- Forgot password ----
attachLiveValidation(forgotForm, { "forgot-email": validateEmail });

forgotForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#forgot-email");
  const note = document.querySelector("#forgot-message");
  const message = validateEmail(email);
  setError(email, message);
  if (message) return;

  const button = forgotForm.querySelector(".primary-button");
  button.disabled = true;
  setNote(note, "Sending reset link...", false);

  const { error } = await db.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: new URL("reset-password.html", window.location.href).href
  });
  button.disabled = false;

  if (error) return setNote(note, error.message, true);
  // Same message whether or not the email has an account
  setNote(note, "If that email has an account, a reset link is on its way. Check your inbox and spam folder.", false);
});
