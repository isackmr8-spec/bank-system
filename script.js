// Professional CRDB Banking System - Full API Integration
// Backend API: http://localhost:3000/api

const API_BASE = 'http://localhost:3000/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };

  try {
    const response = await fetch(API_BASE + endpoint, config);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API error');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Professional Bank JS - Form Validation, Fake Auth, Interactions
document.addEventListener('DOMContentLoaded', function() {
    // Navbar active link
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // OTP Handlers
    document.getElementById('sendOtpBtn')?.addEventListener('click', sendOTP);
    document.getElementById('verifyOtpBtn')?.addEventListener('click', verifyOTP);

// Load dashboard data
async function loadDashboard() {
    try {
        const [accounts, transactions] = await Promise.all([
            apiFetch('/accounts'),
            apiFetch('/transactions?limit=5')
        ]);
        
        // Update balance cards
        const balanceCards = document.querySelectorAll('.card h3');
        accounts.slice(0,4).forEach((acc, i) => {
            if (balanceCards[i]) {
                balanceCards[i].textContent = `💳 ${acc.account_type.toUpperCase()}: TZS ${acc.balance.toLocaleString()}`;
            }
        });
        
        // TODO: Update transaction table
        console.log('Dashboard loaded:', accounts, transactions);
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// Check auth and load dashboard on pages with data
if (document.querySelector('.dashboard')) {
    const token = localStorage.getItem('token');
    if (token) {
        loadDashboard();
    }
}

// Navbar and other UI
// Navbar active link
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        if (validateRegister(data)) {
            const response = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showSuccess('Registration successful! OTP sent (demo: ' + (response.otp_demo || '****') + ')');
            showOtpSection();
            // Store temp data for OTP verify
            localStorage.setItem('pendingRegister', JSON.stringify(data));
        }
    } catch (error) {
        showError(error.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        showSuccess('Login successful! Redirecting...', 'login');
        setTimeout(() => {
            window.location.href = 'dashboard.html'; // Customer dashboard
        }, 1500);
    } catch (error) {
        showError(error.message);
    }
}

function validateRegister(data) {
    if (!data.fullname || !data.phone || !data.email || !data.nida || data.password !== data.confirmPassword) {
        showError('Please fill all fields correctly and passwords match');
        return false;
    }
    if (!/^\+?[\d\s-()]{10,}$/.test(data.phone)) {
        showError('Invalid phone number');
        return false;
    }
    if (!/\S+@\S+\.\S+/.test(data.email)) {
        showError('Invalid email');
        return false;
    }
    return true;
}

let fakeOTP = '';
function sendOTP() {
    fakeOTP = Math.floor(100000 + Math.random() * 900000).toString();
    showSuccess('OTP sent to your phone! (Demo: ' + fakeOTP + ')');
    document.querySelector('.otp-input').focus();
}

async function verifyOTP() {
    const otpInput = document.querySelector('.otp-input').value;
    const pendingData = JSON.parse(localStorage.getItem('pendingRegister') || '{}');
    
    try {
        // Verify OTP with backend (add /auth/verify-otp endpoint later)
        // For now simulate success
        localStorage.setItem('user', JSON.stringify({ 
            id: 1, 
            full_name: pendingData.fullname,
            phone: pendingData.phone,
            role: 'customer'
        }));
        showSuccess('Verification successful! Welcome!', 'register');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    } catch (error) {
        showError('OTP verification failed');
    }
}

function showOtpSection() {
    document.querySelector('.otp-section').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showSuccess(msg, context = '') {
    const successEl = document.querySelector('.success-msg') || createMsgEl('success');
    successEl.textContent = msg;
    successEl.style.display = 'block';
    setTimeout(() => successEl.style.display = 'none', 5000);
}

function showError(msg) {
    const errorEl = document.querySelector('.error-msg') || createMsgEl('error');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 5000);
}

function createMsgEl(type) {
    const el = document.createElement('div');
    el.className = type === 'success' ? 'success-msg' : 'error-msg';
    document.querySelector('.container').appendChild(el);
    return el;
}

