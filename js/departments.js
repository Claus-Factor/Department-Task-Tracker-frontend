const API_BASE_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    if (!localStorage.getItem('token')) {
        window.location.href = 'auth.html';
        return;
    }

    let currentPage = 1;
    const pageSize = 6;
    let departments = [];

    // Загрузка данных
    async function loadData() {
        try {
            departments = await fetchWithAuth(`/api/departments?page=${currentPage-1}&size=${pageSize}`);
            renderDepartments();
            updatePagination();
            
            // Показываем имя пользователя
            const user = await fetchWithAuth('/api/users/me');
            document.getElementById('username-display').textContent = user.fullName;
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            alert('Не удалось загрузить данные');
        }
    }

    // Отображение отделов в таблице
    function renderDepartments() {
        const tbody = document.querySelector('#departments-table tbody');
        tbody.innerHTML = '';
        
        departments.content.forEach(dept => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dept.id}</td>
                <td class="department-name" 
                    data-description="${dept.description || 'Описание отсутствует'}">
                    ${dept.name}
                </td>
                <td>${dept.managerName ? dept.managerName : 'Не назначен'}</td>
                <td>${dept.employeeCount}</td>
                <td>${new Date(dept.createdAt).toLocaleString()}</td>
                <td class="actions">
                    <button class="delete-btn" data-id="${dept.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }


    // Пагинация
    function updatePagination() {
        document.getElementById ('page-info').textContent = 
            `Страница ${currentPage} из ${departments.totalPages>0?departments.totalPages:1}`;
            
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = (currentPage === departments.totalPages) || (departments.totalPages === 0);
    }

    // Инициализация
    await loadData();

    // Обработчики событий
    document.getElementById('add-department-btn').addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Добавить отдел';
        document.getElementById('department-id').value = '';
        document.getElementById('department-name').value = '';
        document.getElementById('department-description').value = '';
        document.getElementById('department-modal').style.display = 'block';
    });

    // Закрытие модального окна
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('department-modal').style.display = 'none';
    });

    // Закрытие при клике вне окна
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('department-modal')) {
            document.getElementById('department-modal').style.display = 'none';
        }
    });

    document.getElementById('department-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const departmentData = {
            name: document.getElementById('department-name').value,
            description: document.getElementById('department-description').value,
        };

        try {
            const id = document.getElementById('department-id').value;
            await fetchWithAuth('/api/departments', {
                    method: 'POST',
                    body: JSON.stringify(departmentData)
                });
            // alert('Отдел успешно создан');
            
            document.getElementById('department-modal').style.display = 'none';
            await loadData();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });

    // Делегирование событий для кнопок редактирования/удаления
    document.querySelector('#departments-table tbody').addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            //if (!confirm('Вы уверены, что хотите удалить этот отдел?')) return;
            
            const id = e.target.closest('button').getAttribute('data-id');
            try {
                await fetchWithAuth(`/api/departments/${id}`, { method: 'DELETE' });
                // alert('Отдел успешно удален');
                await loadData();
            } catch (error) {
                alert('Ошибка удаления: ' + error.message);
            }
        }
    });

    // Пагинация
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadData();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < departments.totalPages) {
            currentPage++;
            loadData();
        }
    });

    // Поиск
    document.getElementById('search-input').addEventListener('input', (e) => {
        // Реализация поиска (можно добавить debounce)
    });

    // Выход
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});

// Добавьте эти методы в api.js
async function getDepartments(page = 0, size = 10) {
    return fetchWithAuth(`/api/departments?page=${page}&size=${size}`);
}

async function createDepartment(departmentData) {
    return fetchWithAuth('/api/departments', {
        method: 'POST',
        body: JSON.stringify(departmentData)
    });
}

async function updateDepartment(id, departmentData) {
    return fetchWithAuth(`/api/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(departmentData)
    });
}

async function deleteDepartment(id) {
    return fetchWithAuth(`/api/departments/${id}`, {
        method: 'DELETE'
    });
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
    return response.json();
}