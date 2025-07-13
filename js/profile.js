const API_BASE_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        // Получаем данные пользователя
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log("Ok")

            console.log(user.username);
            
            // Заполняем профиль
            document.getElementById('username-display').textContent = user.fullName;
            document.getElementById('user-fullname').textContent = user.fullName;
            document.getElementById('user-role').textContent = getRoleName(user.role);
            document.getElementById('user-email').textContent = user.email || 'не указан';
            document.getElementById('user-department').textContent = user.departmentName;

            // Показываем кнопку управления сотрудниками и отделами только для ADMIN
            if (user.role === 'ROLE_ADMIN') {
                document.querySelector('.admin-actions').style.display = 'grid';
                document.querySelector('#department-p').style.display = 'none';
            } else if (user.role === 'ROLE_MANAGER') {
                document.querySelector('.admin-actions').style.display = 'block';
                document.querySelector('#users-btn').style = 'width: 100%';
                document.querySelector('#departments-btn').style.display = 'none';
            }

        }
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        alert('Не удалось загрузить данные профиля');
        localStorage.removeItem('token');
        window.location.href = 'auth.html';
    }

    // Назначаем обработчики кнопок
    document.getElementById('tasks-btn').addEventListener('click', () => {
        window.location.href = 'tasks.html';
    });

    document.getElementById('users-btn').addEventListener('click', () => {
        window.location.href = 'users.html';
    });

    document.getElementById('departments-btn').addEventListener('click', () => {
        window.location.href = 'departments.html';
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});

function getRoleName(role) {
    const roles = {
        'ROLE_ADMIN': 'Администратор',
        'ROLE_MANAGER': 'Руководитель',
        'ROLE_EMPLOYEE': 'Сотрудник'
    };
    return roles[role] || role;
}