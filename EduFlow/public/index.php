<?php
require_once __DIR__ . '/../includes/session.php';
if (isset($_SESSION['admin_id'])) {
    header('Location: dashboard.php');
    exit;
}
require_once __DIR__ . '/../partials/header.php';
?>
<main class="app-root login-page">
    
    <!-- Auth Container (Sign in / Signup) -->
    <div class="main-auth-container" id="auth-container">
        <input type="checkbox" id="chk" aria-hidden="true" checked>

        <div class="signup">
            <form id="signup-form">
                <label for="chk" aria-hidden="true">Sign up</label>
                <input type="text" name="username" placeholder="User name" required="">
                <input type="email" name="email" placeholder="Email" required="">
                <input type="password" name="password" placeholder="Password" required="">
                <button type="submit">Sign up</button>
            </form>
        </div>

        <div class="login">
            <form id="login-form">
                <label for="chk" aria-hidden="true">Sign in</label>
                <input type="text" name="username" id="login-username" placeholder="Username" required="">
                <input type="password" name="password" id="login-password" placeholder="Password" required="">
                <button type="button" class="forgot-pass-btn" id="btn-forgot-password">Forgot password?</button>
                <button type="submit" id="btn-login">Sign in</button>
            </form>
        </div>
    </div>

    <!-- 2FA Container (Hidden by default) -->
    <div class="main-auth-container" id="two-factor-container" style="display: none;">
        <div class="login" style="transform: none; background: rgba(255, 255, 255, 0.15); height: 100%; border-radius: 60% / 10%; border-radius: 0;">
            <form id="two-factor-form">
                <label style="transform: scale(1); margin-top: 60px; cursor: default;">Verifikimi</label>
                <p style="text-align: center; color: #fff; margin-bottom: 20px;">Shkruani kodin e dërguar në email</p>
                
                <input type="text" name="code" id="2fa-code" placeholder="Kodi 6-shifror" required="" maxlength="6" pattern="\d{6}" style="text-align: center; letter-spacing: 5px; font-weight: bold;">
                
                <button type="submit" id="btn-verify">Verifiko</button>
                <button type="button" id="btn-back-login" class="forgot-pass-btn" style="margin-top: 10px;">Kthehu</button>
            </form>
        </div>
    </div>

    <!-- Forgot Password Container (Hidden by default) -->
    <div class="main-auth-container" id="forgot-password-container" style="display: none;">
        <div class="login" style="transform: none; background: rgba(255, 255, 255, 0.15); height: 100%; border-radius: 0;">
            <form id="forgot-password-form">
                <label style="transform: scale(1); margin-top: 40px; cursor: default;">Recovery</label>
                <p style="text-align: center; color: #fff; margin-bottom: 20px; font-size: 0.9em; padding: 0 20px;">Shkruani emrin e përdoruesit për të marrë kodin e verifikimit</p>
                
                <input type="text" name="username" id="forgot-username" placeholder="Username" required="">
                
                <button type="submit" id="btn-send-code">Dërgo kodin</button>
                <button type="button" id="btn-back-forgot" class="forgot-pass-btn" style="margin-top: 10px;">Kthehu</button>
            </form>
        </div>
    </div>

    <!-- Verify Reset Code Container (Hidden by default) -->
    <div class="main-auth-container" id="verify-reset-container" style="display: none;">
        <div class="login" style="transform: none; background: rgba(255, 255, 255, 0.15); height: 100%; border-radius: 0;">
            <form id="verify-reset-form">
                <label style="transform: scale(1); margin-top: 60px; cursor: default;">Verifikimi</label>
                <p style="text-align: center; color: #fff; margin-bottom: 20px;">Shkruani kodin e dërguar</p>
                
                <input type="text" name="code" id="reset-code" placeholder="Kodi" required="" maxlength="6" style="text-align: center; letter-spacing: 5px; font-weight: bold;">
                
                <button type="submit" id="btn-verify-reset">Verifiko</button>
                <button type="button" id="btn-back-reset-code" class="forgot-pass-btn" style="margin-top: 10px;">Anulo</button>
            </form>
        </div>
    </div>

    <!-- New Password Container (Hidden by default) -->
    <div class="main-auth-container" id="new-password-container" style="display: none;">
        <div class="login" style="transform: none; background: rgba(255, 255, 255, 0.15); height: 100%; border-radius: 0;">
            <form id="new-password-form">
                <label style="transform: scale(1); margin-top: 40px; cursor: default;">Fjalëkalimi i ri</label>
                
                <input type="password" name="password" id="new-password" placeholder="Fjalëkalimi i ri" required="" minlength="8">
                <input type="password" name="confirm_password" id="confirm-password" placeholder="Konfirmo fjalëkalimin" required="" minlength="8">
                
                <button type="submit" id="btn-reset-password">Ruaj</button>
            </form>
        </div>
    </div>

</main>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const twoFactorForm = document.getElementById('two-factor-form');
    const authContainer = document.getElementById('auth-container');
    const twoFactorContainer = document.getElementById('two-factor-container');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const verifyResetContainer = document.getElementById('verify-reset-container');
    const newPasswordContainer = document.getElementById('new-password-container');
    
    const btnBack = document.getElementById('btn-back-login');
    const btnForgot = document.getElementById('btn-forgot-password');
    const btnBackForgot = document.getElementById('btn-back-forgot');
    const btnBackResetCode = document.getElementById('btn-back-reset-code');

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const verifyResetForm = document.getElementById('verify-reset-form');
    const newPasswordForm = document.getElementById('new-password-form');

    // Store credentials temporarily for 2FA step
    let tempCredentials = {};
    let resetCode = '';

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-login');
        const originalText = btn.innerText;
        btn.innerText = 'Duke procesuar...';
        btn.disabled = true;

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());
        data.action = 'login';

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            // Handle non-JSON responses gracefully
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                console.error('Server returned non-JSON:', text);
                throw new Error('Server error');
            }

            if (result.status === 'ok') {
                window.location.href = 'dashboard.php';
            } else if (result.requires_2fa) {
                // Switch to 2FA view
                tempCredentials = { 
                    username: data.username, 
                    password: data.password 
                };
                authContainer.style.display = 'none';
                twoFactorContainer.style.display = 'block';
            } else {
                alert(result.message || 'Gabim gjatë kyçjes');
            }
        } catch (error) {
            console.error(error);
            alert('Ndodhi një gabim. Ju lutem provoni përsëri.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // Handle Forgot Password Click
    btnForgot.addEventListener('click', () => {
        authContainer.style.display = 'none';
        forgotPasswordContainer.style.display = 'block';
    });

    // Handle Send Reset Code
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-send-code');
        const originalText = btn.innerText;
        btn.innerText = 'Duke dërguar...';
        btn.disabled = true;

        const username = document.getElementById('forgot-username').value;

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'request_password_reset', username })
            });
            const result = await response.json();

            if (result.status === 'ok') {
                forgotPasswordContainer.style.display = 'none';
                verifyResetContainer.style.display = 'block';
                // alert(result.message);
            } else {
                alert(result.message || 'Gabim');
            }
        } catch (error) {
            alert('Ndodhi një gabim.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // Handle Verify Reset Code
    verifyResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-verify-reset');
        btn.innerText = 'Duke verifikuar...';
        btn.disabled = true;

        const code = document.getElementById('reset-code').value;
        resetCode = code;

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_reset_code', code })
            });
            const result = await response.json();

            if (result.status === 'ok') {
                verifyResetContainer.style.display = 'none';
                newPasswordContainer.style.display = 'block';
            } else {
                alert(result.message || 'Kodi i pasaktë');
            }
        } catch (error) {
            alert('Ndodhi një gabim.');
        } finally {
            btn.innerText = 'Verifiko';
            btn.disabled = false;
        }
    });

    // Handle New Password Submit
    newPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;

        if (pass !== confirm) {
            alert('Fjalëkalimet nuk përputhen');
            return;
        }

        const btn = document.getElementById('btn-reset-password');
        btn.innerText = 'Duke ruajtur...';
        btn.disabled = true;

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'verify_password_reset', 
                    code: resetCode, 
                    password: pass 
                })
            });
            const result = await response.json();

            if (result.status === 'ok') {
                alert('Fjalëkalimi u ndryshua me sukses. Ju lutem kyçuni.');
                window.location.reload();
            } else {
                alert(result.message || 'Gabim');
            }
        } catch (error) {
            alert('Ndodhi një gabim.');
        } finally {
            btn.innerText = 'Ruaj';
            btn.disabled = false;
        }
    });

    // Back Buttons
    btnBackForgot.addEventListener('click', () => {
        forgotPasswordContainer.style.display = 'none';
        authContainer.style.display = 'block';
    });

    btnBackResetCode.addEventListener('click', () => {
        verifyResetContainer.style.display = 'none';
        forgotPasswordContainer.style.display = 'block';
    });

    // Handle 2FA Verify
    twoFactorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-verify');
        btn.innerText = 'Duke verifikuar...';
        btn.disabled = true;

        const code = document.getElementById('2fa-code').value;
        
        // Prepare payload with original credentials AND code
        const data = {
            action: 'login',
            username: tempCredentials.username,
            password: tempCredentials.password,
            two_factor_code: code
        };

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.status === 'ok') {
                window.location.href = 'dashboard.php';
            } else {
                alert(result.message || 'Kodi i pasaktë');
            }
        } catch (error) {
            console.error(error);
            alert('Ndodhi një gabim gjatë verifikimit.');
        } finally {
            btn.innerText = 'Verifiko';
            btn.disabled = false;
        }
    });

    // Handle Back Button
    btnBack.addEventListener('click', () => {
        twoFactorContainer.style.display = 'none';
        authContainer.style.display = 'block';
        tempCredentials = {};
        document.getElementById('2fa-code').value = '';
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = signupForm.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Duke procesuar...';
        btn.disabled = true;

        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData.entries());
        data.action = 'signup';

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.status === 'ok') {
                alert(result.message || 'Kërkesa u dërgua me sukses. Prisni aprovimin.');
                // Optionally switch to login
                document.getElementById('chk').checked = true;
                signupForm.reset();
            } else {
                alert(result.message || 'Gabim gjatë regjistrimit');
            }
        } catch (error) {
            console.error(error);
            alert('Ndodhi një gabim.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
});
</script>
</body>
</html>
