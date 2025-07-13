const API_BASE_URL = 'http://localhost:8080';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const credentials = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    console.log(credentials);

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка авторизации');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = 'profile.html';
        
    } catch (error) {
        alert("Неверный логин или пароль");
        console.error('Неверный логин или пароль');
    }
});