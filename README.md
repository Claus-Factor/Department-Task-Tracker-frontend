# Task Tracker System (Frontend)

Клиентская часть системы управления задачами с ролевой моделью доступа (ADMIN, MANAGER, EMPLOYEE) и JWT-аутентификацией.

## Быстрый старт

### Предварительные требования
- Установленный [Node.js](https://nodejs.org/) (для http-server)
- Запущенный бэкенд (порт 8080)
- PostgreSQL

### Запуск фронтенда через http-server

1. **Установите http-server глобально**:
   ```bash
   npm install -g http-server

2. **Убедитесь, что бэкенд доступен по адресу:**:
    ```bash
    http://localhost:8080

3. **Запустите сервер:**:
    ```bash
    http-server -p 3000

4. **Откройте в браузере:**:
    ```bash
    http://localhost:3000/index.html