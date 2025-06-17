// Utility functions
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}
function setUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}
function getDocs() {
    return JSON.parse(localStorage.getItem('documents') || '[]');
}
function setDocs(docs) {
    localStorage.setItem('documents', JSON.stringify(docs));
}
function hash(str) {
    // Simple hash for demo only (not secure for real use)
    let hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash.toString();
}

// Password policy: min 8 chars, 1 upper, 1 lower, 1 special
function isStrongPassword(pw) {
    return pw.length >= 8 &&
        /[A-Z]/.test(pw) &&
        /[a-z]/.test(pw) &&
        /[^A-Za-z0-9]/.test(pw);
}

// UI Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');
const dashboard = document.getElementById('dashboard');
const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const uploadError = document.getElementById('upload-error');
const uploadSuccess = document.getElementById('upload-success');
const docList = document.getElementById('doc-list');
const logoutBtn = document.getElementById('logout-btn');
const formTitle = document.getElementById('form-title');
const recaptchaContainer = document.getElementById('recaptcha-container');

let currentUser = null;

// Switch forms
showRegister.onclick = e => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginError.textContent = '';
    formTitle.textContent = 'Register';
};
showLogin.onclick = e => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerError.textContent = '';
    registerSuccess.textContent = '';
    formTitle.textContent = 'Login';
};

// Register
registerForm.onsubmit = e => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    registerError.textContent = '';
    registerSuccess.textContent = '';

    if (!isStrongPassword(password)) {
        registerError.textContent = "Password must be at least 8 characters, include uppercase, lowercase, and a special character.";
        return;
    }
    let users = getUsers();
    if (users.find(u => u.username === username)) {
        registerError.textContent = "Registration failed. Please try again.";
        return;
    }
    users.push({ username, password: hash(password), role });
    setUsers(users);
    registerSuccess.textContent = "Registration successful! You can now login.";
    registerForm.reset();
};

// Login
loginForm.onsubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();

    // Rate limiting
    let attempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    let blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '{}');
    if (blockedUsers[username]) {
        const now = Date.now();
        if (now < blockedUsers[username]) {
            const mins = Math.ceil((blockedUsers[username] - now) / 60000);
            loginError.textContent = `Account is blocked. Try again in ${mins} minute(s).`;
            return;
        } else {
            delete blockedUsers[username];
            localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
        }
    }

    // Show captcha after 3 failed attempts
    if ((attempts[username] || 0) >= 3) {
        recaptchaContainer.style.display = 'block';
        if (typeof grecaptcha !== "undefined") {
            const captchaResponse = grecaptcha.getResponse();
            if (!captchaResponse) {
                loginError.textContent = "Please complete the captcha.";
                return;
            }
        } else {
            loginError.textContent = "Captcha not loaded. Please wait.";
            return;
        }
    } else {
        recaptchaContainer.style.display = 'none';
    }

    // Call your original login logic
    let prevAttempts = attempts[username] || 0;
    let beforeUser = currentUser;
    if (typeof originalLoginHandler === "function") {
        await originalLoginHandler.apply(this, arguments);
    }

    // If login failed, increment attempts and block after 5
    if (!currentUser || currentUser.username !== username) {
        attempts[username] = prevAttempts + 1;
        localStorage.setItem('loginAttempts', JSON.stringify(attempts));
        if (attempts[username] >= 5) {
            blockedUsers[username] = Date.now() + 3 * 60 * 1000;
            localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
            loginError.textContent = "Account is blocked for 3 minutes due to too many failed attempts.";
            recaptchaContainer.style.display = 'none';
            if (window.grecaptcha) grecaptcha.reset();
        } else if (attempts[username] >= 3) {
            recaptchaContainer.style.display = 'block';
            loginError.textContent = `Login failed. Please solve the captcha. You have ${5 - attempts[username]} attempt(s) left.`;
            if (window.grecaptcha) grecaptcha.reset();
        } else {
            loginError.textContent = `Login failed. You have ${5 - attempts[username]} attempt(s) left.`;
        }
        return;
    }

    // On success, reset attempts and hide captcha
    if (attempts[username]) {
        delete attempts[username];
        localStorage.setItem('loginAttempts', JSON.stringify(attempts));
    }
    if (window.grecaptcha) grecaptcha.reset();
    recaptchaContainer.style.display = 'none';

    resetInactivityTimer();
};

// Show dashboard
function showDashboard() {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    dashboard.classList.remove('hidden');
    userName.textContent = currentUser.username;
    userRole.textContent = currentUser.role;
    uploadError.textContent = '';
    uploadSuccess.textContent = '';
    fileInput.value = '';
    renderDocs();
}

// Upload PDF
uploadForm.onsubmit = e => {
    e.preventDefault();
    uploadError.textContent = '';
    uploadSuccess.textContent = '';
    const file = fileInput.files[0];
    if (!file) {
        uploadError.textContent = "Please select a PDF file.";
        return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        uploadError.textContent = "Only PDF files are allowed.";
        return;
    }
    // Read file as base64 (simulate storage)
    const reader = new FileReader();
    reader.onload = function(evt) {
        let docs = getDocs();
        docs.push({
            owner: currentUser.username,
            name: file.name,
            data: evt.target.result,
            uploaded: new Date().toISOString()
        });
        setDocs(docs);
        uploadSuccess.textContent = "File uploaded successfully.";
        fileInput.value = '';
        renderDocs();
    };
    reader.onerror = function() {
        uploadError.textContent = "An error occurred during upload. Please try again.";
    };
    reader.readAsDataURL(file);
};

// Render documents
function renderDocs() {
    let docs = getDocs();
    docList.innerHTML = '';
    let visibleDocs = [];
    if (currentUser.role === 'admin') {
        visibleDocs = docs;
    } else {
        visibleDocs = docs.filter(d => d.owner === currentUser.username);
    }
    if (visibleDocs.length === 0) {
        docList.innerHTML = '<li>No documents found.</li>';
        return;
    }
    visibleDocs.forEach(doc => {
        const li = document.createElement('li');
        li.className = 'doc-item';
        li.innerHTML = `<strong>${doc.name}</strong> (uploaded by ${doc.owner}) 
            <a href="${doc.data}" download="${doc.name}">Download</a>`;
        docList.appendChild(li);
    });
}

// Logout
logoutBtn.onclick = () => {
    currentUser = null;
    dashboard.classList.add('hidden');
    loginForm.classList.remove('hidden');
    loginForm.reset();
    loginError.textContent = '';
};

// Inactivity logout (15 minutes)
const INACTIVITY_LIMIT = 15 * 60 * 1000;
let inactivityTimer = null;
function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        currentUser = null;
        dashboard.classList.add('hidden');
        loginForm.classList.remove('hidden');
        loginForm.reset();
        loginError.textContent = "You have been logged out due to inactivity.";
    }, INACTIVITY_LIMIT);
}
['mousemove', 'keydown', 'click'].forEach(evt =>
    document.addEventListener(evt, () => {
        if (currentUser) resetInactivityTimer();
    })
);
