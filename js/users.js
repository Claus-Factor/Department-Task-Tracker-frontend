const API_BASE_URL = 'http://localhost:8080';

let currentPage = 1;
const pageSize = 6;
let currentRoleFilter = 'ROLE_EMPLOYEE';
let currentDepartmentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Загрузка информации о пользователе
    await loadUserInfo();

    // Загрузка отделов
    await loadDepartments();
    
    // Загрузка списка пользователей
    await loadUsers();
    
    // Настройка обработчиков событий
    setupEventListeners();
});

async function loadUserInfo() {
    try {
        const user = await fetchWithAuth('/api/users/me');
        document.getElementById('username-display').textContent = user.fullName;

        if (user.role === 'ROLE_MANAGER') {
            document.querySelector('#department-filter').style.display = 'none';
        }

    } catch (error) {
        console.error('Ошибка при загрузке информации о пользователе:', error);
    }
    
}
        
async function loadUsers() {
    try {
        const currentUser = await fetchWithAuth('/api/users/me');
        let url = `/api/users?page=${currentPage - 1}&size=${pageSize}`;

        if (currentRoleFilter !== 'ALL') {
            url = `/api/users/by-role?role=${currentRoleFilter}&page=${currentPage - 1}&size=${pageSize}`;
        }

        // Добавляем фильтр по отделу, если выбран
        if (currentDepartmentFilter !== 'ALL' && currentDepartmentFilter != null) {
            url += url.includes('?') ? '&' : '?';
            url += `&departmentId=${currentDepartmentFilter}`;
        }
        console.log(url)

        const data = await fetchWithAuth(url);
        renderUsersTable(data.content);
        updatePaginationInfo(data);

        console.log(data);
        
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        alert('Не удалось загрузить список пользователей');
    }
}

async function renderUsersTable(users) {
    const currentUser = await fetchWithAuth('/api/users/me');

    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    

    // Явно перечисляем роли
    const allRoles = [
        { value: 'ROLE_MANAGER', text: 'Руководитель' },
        { value: 'ROLE_EMPLOYEE', text: 'Сотрудник' }
    ];

    users.forEach(user => {
        const tr = document.createElement('tr');
    const userRole = allRoles.find(role => role.value === user.role)?.text || "Роль не указана";
        
    tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.fullName}</td>
        <td>${userRole}</td>
        <td>${user.departmentName}</td>
    `;
    if (currentUser.role == "ROLE_ADMIN") {
        tr.innerHTML += `
        <td>
            <button class="edit-btn" data-id="${user.id}">Роль</button>
            <button class="delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i></button>
        </td>
        `;
    } else {
        document.querySelector("#action-th").style.display = 'none';
    }
    
    tbody.appendChild(tr);
    });
}

function updatePaginationInfo(pageData) {
    document.getElementById('page-info').textContent = 
        `Страница ${currentPage} из ${pageData.totalPages>0?pageData.totalPages:1}`;
        
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = (currentPage === pageData.totalPages) || (pageData.totalPages === 0);
}

function setupEventListeners() {
    // Выход из системы
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
    
    // Фильтрация по роли
    document.getElementById('role-filter').addEventListener('change', (e) => {
        currentRoleFilter = e.target.value;
        currentPage = 1;
        loadUsers();
    });

    // Фильтрация по отделу
    document.getElementById('department-filter').addEventListener('change', (e) => {
        currentDepartmentFilter = e.target.value === 'ALL' ? null : e.target.value;
        currentPage = 1;
        loadUsers();
    });
    
    // Пагинация
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadUsers();
    });
    
    
    // Редактирование и удаление (делегирование событий)
    document.querySelector('#users-table tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const userId = e.target.getAttribute('data-id');
            console.log(userId)
            editUser(userId);
        } else if (e.target.classList.contains('delete-btn')) {
            const userId = e.target.getAttribute('data-id');
            deleteUser(userId);
            alert('Пользователь успешно удален');
            loadUsers(); // Перезагружаем список пользователей
        }
    });
    
    // Модальное окно
    const modal = document.getElementById('user-modal');
    document.querySelector('.close').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Форма пользователя
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUser();
    });
}

let currentEditingUserId = null;


// Редактирование пользователя
async function editUser(userId) {
    try {
        const user = await getUserById(userId);

        const modal = document.getElementById('user-modal');
        
        document.getElementById('modal-title').textContent = 'Редактировать роль';
        document.getElementById('user-id').value = user.id;
        document.getElementById('modal-role').value = user.role;
        modal.style.display = 'block';
        currentEditingUserId = userId;

    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        alert('Не удалось загрузить данные пользователя');
    }
}

// Удаление пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        await deleteUser(userId);
        alert('Пользователь успешно удален');
        loadUsers(); // Перезагружаем список пользователей
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        alert('Не удалось удалить пользователя');
    }
}

// Сохранение пользователя
async function saveUser() {
    const id = document.getElementById('user-id').value;
    const role = document.getElementById('modal-role').value;
    console.log(role)
    
    const userData = {
        role
    };
    
    try {
        if (id) {
            // Редактирование существующего пользователя
            await fetchWithAuth(`/api/users/${id}/role?role=${role}`, {
                method: 'PUT'
            });
            alert('Пользователь успешно обновлен');
        }
        
        // Закрываем модальное окно и обновляем список
        document.getElementById('user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        console.error('Ошибка при сохранении пользователя:', error);
        alert('Ошибка: ' + error.message);
    }
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Требуется авторизация');
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.log(response)
        throw new Error(error.message || 'Ошибка запроса');
    }
    
    return response.json();
}

async function getUserById(id) {
    console.log("Пользователь по id")

    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });

    if (response.ok) {
        const user = await response.json();
        console.log(user)
        return user
    }
}

async function updateUser(id, userData) {
    return fetchWithAuth(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
}

async function updateUserRole(id, role) {
    return fetchWithAuth(`/users/${id}/role?role=${role}`, {
        method: 'PUT'
    });
}

async function deleteUser(id) {
    return fetchWithAuth(`/api/users/${id}`, {
        method: 'DELETE'
    });
    
}

async function loadDepartments() {
    const select = document.getElementById('department-filter');
    
    try {
        select.innerHTML = '<option value="">Загрузка отделов...</option>';
        select.disabled = true;

        const pageData = await fetchWithAuth('/api/departments?size=100&sort=name,asc');
        
        if (!pageData.content || !Array.isArray(pageData.content)) {
            throw new Error('Некорректный формат данных отделов');
        }

        select.innerHTML = '';
        select.appendChild(new Option('Все отделы', 'ALL'));

        pageData.content.forEach(dept => {
            select.appendChild(new Option(dept.name, dept.id));
        });

    } catch (error) {
        console.error('Ошибка загрузки отделов:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    } finally {
        select.disabled = false;
    }
}