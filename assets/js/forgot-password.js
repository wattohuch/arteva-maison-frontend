/**
 * Forgot Password Handler
 * Handles OTP-based password reset flow
 */

var API_BASE_URL = window.API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://arteva-maison-backend-gy1x.onrender.com/api');

let currentEmail = '';

// DOM Elements
const requestOTPForm = document.getElementById('requestOTPForm');
const verifyOTPForm = document.getElementById('verifyOTPForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const successForm = document.getElementById('successForm');

const requestOTPFormElement = document.getElementById('requestOTPFormElement');
const verifyOTPFormElement = document.getElementById('verifyOTPFormElement');
const resetPasswordFormElement = document.getElementById('resetPasswordFormElement');

const resetEmailInput = document.getElementById('resetEmail');
const otpCodeInput = document.getElementById('otpCode');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

const requestOTPMessage = document.getElementById('requestOTPMessage');
const verifyOTPMessage = document.getElementById('verifyOTPMessage');
const resetPasswordMessage = document.getElementById('resetPasswordMessage');

const resendOTPLink = document.getElementById('resendOTPLink');

// Step 1: Request OTP
requestOTPFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = resetEmailInput.value.trim();
    if (!email) {
        showMessage(requestOTPMessage, 'Please enter your email address', 'error');
        return;
    }

    currentEmail = email;

    try {
        showMessage(requestOTPMessage, 'Sending OTP...', 'info');

        const data = await window.AuthAPI.requestPasswordReset(email);

        if (data.success) {
            showMessage(requestOTPMessage, 'OTP has been sent to your email. Please check your inbox.', 'success');
            // Move to next step
            setTimeout(() => {
                requestOTPForm.style.display = 'none';
                verifyOTPForm.style.display = 'block';
                otpCodeInput.focus();
            }, 2000);
        } else {
            showMessage(requestOTPMessage, data.message || 'Failed to send OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error requesting OTP:', error);
        showMessage(requestOTPMessage, error.message || 'An error occurred. Please try again.', 'error');
    }
});

// Step 2: Verify OTP
verifyOTPFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = otpCodeInput.value.trim();
    if (!otp || otp.length !== 6) {
        showMessage(verifyOTPMessage, 'Please enter a valid 6-digit OTP', 'error');
        return;
    }

    try {
        showMessage(verifyOTPMessage, 'Verifying OTP...', 'info');

        const data = await window.AuthAPI.verifyOTP(currentEmail, otp);

        if (data.success) {
            showMessage(verifyOTPMessage, 'OTP verified successfully!', 'success');
            // Move to next step
            setTimeout(() => {
                verifyOTPForm.style.display = 'none';
                resetPasswordForm.style.display = 'block';
                newPasswordInput.focus();
            }, 1500);
        } else {
            showMessage(verifyOTPMessage, data.message || 'Invalid OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showMessage(verifyOTPMessage, error.message || 'An error occurred. Please try again.', 'error');
    }
});

// Step 3: Reset Password
resetPasswordFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    if (newPassword.length < 6) {
        showMessage(resetPasswordMessage, 'Password must be at least 6 characters long', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage(resetPasswordMessage, 'Passwords do not match', 'error');
        return;
    }

    try {
        showMessage(resetPasswordMessage, 'Resetting password...', 'info');

        const data = await window.AuthAPI.resetPassword(currentEmail, otpCodeInput.value.trim(), newPassword);

        if (data.success) {
            showMessage(resetPasswordMessage, 'Password reset successfully!', 'success');
            // Show success screen
            setTimeout(() => {
                resetPasswordForm.style.display = 'none';
                successForm.style.display = 'block';
            }, 1500);
        } else {
            showMessage(resetPasswordMessage, data.message || 'Failed to reset password. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showMessage(resetPasswordMessage, error.message || 'An error occurred. Please try again.', 'error');
    }
});

// Resend OTP
resendOTPLink.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!currentEmail) {
        showMessage(verifyOTPMessage, 'Please request OTP first', 'error');
        return;
    }

    try {
        showMessage(verifyOTPMessage, 'Resending OTP...', 'info');

        const data = await window.AuthAPI.requestPasswordReset(currentEmail);

        if (data.success) {
            showMessage(verifyOTPMessage, 'OTP has been resent to your email.', 'success');
        } else {
            showMessage(verifyOTPMessage, data.message || 'Failed to resend OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        showMessage(verifyOTPMessage, error.message || 'An error occurred. Please try again.', 'error');
    }
});

// Helper function to show messages
function showMessage(element, message, type) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = `form-message ${type}`;

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Format OTP input (only numbers, max 6 digits)
otpCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if email is in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
        resetEmailInput.value = email;
        currentEmail = email;
    }
});

