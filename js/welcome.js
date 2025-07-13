const API_BASE_URL = 'http://localhost:8080';

// Проверяем, авторизован ли пользователь
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';

        document.getElementById('message-for-guest').style.display = 'none';
        document.getElementById('message-for-user').style.display = 'inline';
        
        // Получаем информацию о пользователе
        fetchUserInfo();
    }
});
async function fetchUserInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            document.getElementById('username-display').textContent = user.fullName;
            console.log("Ok")
        }
    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload();
});