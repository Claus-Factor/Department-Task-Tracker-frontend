const API_BASE_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/departments/list`);
        if (!response.ok) throw new Error('Не удалось загрузить отделы');
        
        const departments = await response.json();
        const select = document.getElementById('department');
        
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки отделов:', error);
        alert('Не удалось загрузить список отделов');
    }
});

// Обработка формы регистрации
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        fullName: document.getElementById('fullName').value,
        departmentId: document.getElementById('department').value
    };
    console.log(userData)

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/sign-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка регистрации');
        }
        
        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = 'profile.html';
    } catch (error) {
        alert(`Пользователь с таким логином или email уже зарегистрирован`);
    }
});