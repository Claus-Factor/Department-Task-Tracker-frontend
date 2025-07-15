const API_BASE_URL = 'http://localhost:8080';

let currentPage = 1;
const pageSize = 6;
let currentStatusFilter = '';
let currentPriorityFilter = '';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Загрузка информации о пользователе
    const user = await loadUserInfo();
    
    // Проверка роли и скрытие элементов
    if (user.role === 'ROLE_EMPLOYEE' || user.role === 'ROLE_ADMIN') {
        document.getElementById('add-task-btn').style.display = 'none';
    }
    
    // Загрузка списка пользователей для выбора исполнителя
    await loadAssignees();
    
    // Загрузка списка задач
    await loadTasks();
    
    // Настройка обработчиков событий
    setupEventListeners();
});

async function loadUserInfo() {
    try {
        const user = await fetchWithAuth('/api/users/me');
        console.log(user)
        document.getElementById('username-display').textContent = user.username;
        return user;
    } catch (error) {
        console.error('Ошибка при загрузке информации о пользователе:', error);
    }
}

async function loadAssignees() {
    console.log("Попытка загрузки списка пользователей")
    try {
        const data = await fetchWithAuth('/api/users/by-role?role=ROLE_EMPLOYEE&page=0&size=100');
        const assigneeSelect = document.getElementById('task-assignee');
        assigneeSelect.innerHTML = '';
        
        data.content.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.fullName} (${user.username})`;
            assigneeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка пользователей:', error);
    }
}

async function loadTasks() {
    try {
        const params = new URLSearchParams({
            page: currentPage - 1,
            size: pageSize,
            ...(currentStatusFilter && { status: currentStatusFilter }),
            ...(currentPriorityFilter && { priority: currentPriorityFilter }),
            ...(currentSearchQuery && { search: currentSearchQuery })
        });
        
        const data = await fetchWithAuth(`/api/tasks?${params}`);
        renderTasksTable(data.content);
        updatePaginationInfo(data);

    } catch (error) {
        console.error('Ошибка при загрузке задач:', error);
        alert('Не удалось загрузить список задач');
    }
}

async function renderTasksTable(tasks) {
    const tbody = document.querySelector('#tasks-table tbody');
    tbody.innerHTML = '';
    const user = await fetchWithAuth('/api/users/me');
    
    tasks.forEach(task => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td class="for-hide"><span class="status-badge ${task.status.toLowerCase()}">${getStatusText(task.status)}</span></td>
            <td><span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span></td>
            <td>${task.assignee.fullName}</td>
            <td class="for-hide">${task.deadline ? new Date(task.deadline).toLocaleString() : 'Нет'}</td>
        `;
        
        if (user.role === "ROLE_MANAGER") {
            tr.innerHTML += `
            <td>
                <div>
                    <button class="view-btn" data-id="${task.id}">👁</button>
                    <button class="edit-btn" data-id="${task.id}">&#9998</button>
                    <button class="delete-btn" data-id="${task.id}"><b>&#10005</b></button>
                </div>
            </td>
        `
        } else if (user.role === "ROLE_EMPLOYEE") {
            tr.innerHTML += `
            <td>
                <button class="view-btn" data-id="${task.id}">👁</button>
                <button class="change-status-btn" data-id="${task.id}">☑</button>
            </td>
        `
        } else {
            tr.innerHTML += `
            <td>
                <button class="view-btn" data-id="${task.id}">👁</button>
            </td>
        `
        }
        
        tbody.appendChild(tr);
    });
}

// Обработчик для кнопки смены статуса в setupEventListeners():
document.querySelector('#tasks-table tbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('change-status-btn')) {
        const taskId = e.target.getAttribute('data-id');
        showStatusChangeModal(taskId);
    }
});

// Функция для отображения модального окна смены статуса:
async function showStatusChangeModal(taskId) {
    const task = await getTaskById(taskId);
    const modal = document.createElement('div');
    modal.className = 'modal';

    // Явно перечисляем все возможные статусы
    const allStatuses = [
        { value: 'NEW', text: 'Новая' },
        { value: 'IN_PROGRESS', text: 'В работе' },
        { value: 'COMPLETED', text: 'Завершена' },
        { value: 'CANCELLED', text: 'Отменена' }
    ];

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close">&times;</span>
            <h2>Сменить статус задачи</h2>
            <p>Текущий статус: <strong>${getStatusText(task.status)}</strong></p>
            <div class="status-options">
                ${allStatuses.map(status => `
                    <button class="status-option" 
                            data-status="${status.value}" 
                            ${task.status === status.value ? 'hidden' : ''}>
                        ${status.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Обработчики для кнопок статусов
    modal.querySelectorAll('.status-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newStatus = btn.getAttribute('data-status');
            try {
                await changeTaskStatus(taskId, newStatus);
                modal.remove();
                loadTasks();
            } catch (error) {
                alert('Ошибка при изменении статуса: ' + error.message);
            }
        });
    });
    
    // Закрытие модального окна
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Добавьте функцию для изменения статуса:
async function changeTaskStatus(taskId, newStatus) {
    try {
        await fetchWithAuth(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        // alert('Статус задачи успешно изменен');
    } catch (error) {
        console.error('Ошибка при изменении статуса:', error);
        throw error;
    }
}

function getStatusText(status) {
    const statusMap = {
        'NEW': 'Новая',
        'IN_PROGRESS': 'В работе',
        'COMPLETED': 'Завершена',
        'CANCELLED': 'Отменена'
    };
    return statusMap[status] || status;
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
    
    // Фильтры
    document.getElementById('status-filter').addEventListener('change', (e) => {
        currentStatusFilter = e.target.value;
        currentPage = 1;
        loadTasks();
    });
    
    document.getElementById('priority-filter').addEventListener('change', (e) => {
        currentPriorityFilter = e.target.value;
        currentPage = 1;
        loadTasks();
    });
    
    document.getElementById('search-input').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        currentPage = 1;
        loadTasks();
    });
    
    // Пагинация
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadTasks();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadTasks();
    });
    
    // Добавление задачи
    document.getElementById('add-task-btn').addEventListener('click', () => {
        openTaskModal();
    });
    
    // Действия с задачами (делегирование событий)
    document.querySelector('#tasks-table tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const taskId = e.target.getAttribute('data-id');
            viewTask(taskId);
        } else if (e.target.classList.contains('edit-btn')) {
            const taskId = e.target.getAttribute('data-id');
            editTask(taskId);
        } else if (e.target.classList.contains('delete-btn')) {
            const taskId = e.target.getAttribute('data-id');
            deleteTask(taskId);
        }
    });
    
    // Модальные окна
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Форма задачи
    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTask();
    });
    
    // Форма комментария
    document.getElementById('add-comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addComment();
    });
}


let currentEditingTaskId = null;

// Открытие модального окна для создания задачи
function openTaskModal() {
    const modal = document.getElementById('task-modal');
    document.getElementById('modal-title').textContent = 'Создать задачу';
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = 'MEDIUM';
    document.getElementById('task-deadline').value = '';
    modal.style.display = 'block';
}

async function getTaskById(taskId) {
    return fetchWithAuth(`/api/tasks/${taskId}`);
}

// Редактирование задачи
async function editTask(taskId) {
    try {
        const task = await fetchWithAuth(`/api/tasks/${taskId}`);
        const modal = document.getElementById('task-modal');
        
        document.getElementById('modal-title').textContent = 'Редактировать задачу';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-assignee').value = task.assignee.id;
        
        if (task.deadline) {
            const deadlineDate = new Date(task.deadline);
            const formattedDeadline = deadlineDate.toISOString().slice(0, 16);
            document.getElementById('task-deadline').value = formattedDeadline;
        } else {
            document.getElementById('task-deadline').value = '';
        }
        
        modal.style.display = 'block';
        currentEditingTaskId = taskId;
    } catch (error) {
        console.error('Ошибка при получении данных задачи:', error);
        alert('Не удалось загрузить данные задачи');
    }
}

// Просмотр задачи с комментариями
async function viewTask(taskId) {
    try {
        const [task, comments] = await Promise.all([
            getTaskById(taskId),
            fetchWithAuth(`/api/tasks/${taskId}/comments`)
        ]);
        
        const modal = document.getElementById('view-task-modal');
        document.getElementById('view-task-title').textContent = task.title;
        document.getElementById('view-task-status').textContent = getStatusText(task.status);
        document.getElementById('view-task-priority').textContent = task.priority;
        document.getElementById('view-task-assignee').textContent = task.assignee.fullName;
        document.getElementById('view-task-author').textContent = task.assigner.fullName;
        document.getElementById('view-task-created-at').textContent = new Date(task.createdAt).toLocaleString();
        document.getElementById('view-task-deadline').textContent = task.deadline
            ? new Date(task.deadline).toLocaleString() 
            : 'Нет';
        document.getElementById('view-task-description').textContent = task.description || 'Нет описания';
        document.getElementById('comment-task-id').value = taskId;
        
        // Очищаем и заполняем список комментариев
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Нет комментариев</p>';
        } else {
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.innerHTML = `
                    <div class="comment-author">${comment.author.fullName}</div>
                    <div class="comment-date">${new Date(comment.createdAt).toLocaleString()}</div>
                    <div class="comment-text">${comment.text}</div>
                    <button class="delete-comment-btn" data-id="${comment.id}"><i class="fas fa-trash"></i></button>
                `;
                commentsList.appendChild(commentDiv);
            });
        }
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Ошибка при просмотре задачи:', error);
        alert('Не удалось загрузить данные задачи');
    }
}

// Удаление задачи
async function deleteTask(taskId) {
    try {
        fetchWithAuth(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        alert('Задача успешно удалена');
        loadTasks(); // Перезагружаем список задач
    } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
        alert('Не удалось удалить задачу');
    }
}

// Сохранение задачи
async function saveTask() {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;
    const deadline = document.getElementById('task-deadline').value;
    const assigneeId = document.getElementById('task-assignee').value;
    
    const taskData = {
        title,
        description,
        priority,
        assigneeId: parseInt(assigneeId),
        ...(deadline && { deadline })
    };
    
    try {
        if (id) {
            // Редактирование существующей задачи
            await updateTask(id, taskData);
            // alert('Задача успешно обновлена');
        } else {
            // Создание новой задачи
            await createTask(taskData);
            // alert('Задача успешно создана');
            console.log(taskData)
        }
        
        // Закрываем модальное окно и обновляем список
        document.getElementById('task-modal').style.display = 'none';
        loadTasks();
    } catch (error) {
        console.error('Ошибка при сохранении задачи:', error);
        alert('Ошибка: ' + error.message);
    }
}

async function createTask(taskData) {
    return fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
}

async function updateTask(taskId, taskData) {
    return fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
    });
}

// Добавление комментария
async function addComment() {
    const taskId = document.getElementById('comment-task-id').value;
    const text = document.getElementById('comment-text').value;
    
    try {
        await fetchWithAuth(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        document.getElementById('comment-text').value = '';
        
        // Перезагружаем комментарии
        const comments = await fetchWithAuth(`/api/tasks/${taskId}/comments`);
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = '';
        
        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.innerHTML = `
                <div class="comment-author">${comment.author.fullName}</div>
                <div class="comment-date">${new Date(comment.createdAt).toLocaleString()}</div>
                <div class="comment-text">${comment.text}</div>
                <button class="delete-comment-btn" data-id="${comment.id}"><i class="fas fa-trash"></i></button>
            `;
            commentsList.appendChild(commentDiv);
        });
    } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        alert('Не удалось добавить комментарий');
    }
}

// Удаление комментария
async function deleteComment(commentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tasks/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        if (response.status === 204) {
            // alert('Комментарий успешно удален');

            // Перезагружаем комментарии
            const taskId = document.getElementById('comment-task-id').value;
            const comments = await fetchWithAuth(`/api/tasks/${taskId}/comments`);
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = '';
            
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.innerHTML = `
                    <div class="comment-author">${comment.author.fullName}</div>
                    <div class="comment-date">${new Date(comment.createdAt).toLocaleString()}</div>
                    <div class="comment-text">${comment.text}</div>
                    <button class="delete-comment-btn" data-id="${comment.id}"><i class="fas fa-trash"></i></button>
                `;
                commentsList.appendChild(commentDiv);
            });
        } else  {
            alert('Нельзя удалить чужой комментарий!');
        }
    } catch (error) {
        // console.error('Ошибка при удалении комментария:', error);
        alert('Не удалось удалить комментарий');
    }
}

// Обработчик кликов на комментарии (делегирование событий)
document.getElementById('comments-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-comment-btn')) {
        const commentId = e.target.getAttribute('data-id');
        deleteComment(commentId);
    }
});

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