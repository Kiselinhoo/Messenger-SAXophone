Контракт Андрея. S4-03. Каркас backend.

При прямом запуске из каталога `backend` сначала примените миграции к базе, указанной в `DATABASE_URL`.
Сервер запустится только после успешного завершения миграций.

```bash
alembic upgrade head && python -m uvicorn app.main:app --reload
```

Точка входа:
app.main:app — объект FastAPI.

Настройки:
get_settings() из app.config возвращает общие настройки.
DATABASE_URL — подключение PostgreSQL через SQLAlchemy/psycopg.
CORS_ORIGINS — JSON-массив разрешённых адресов интерфейса.
Настройки читаются из окружения и backend/.env.
Окружение имеет приоритет. .env не включается в Git.

Подключение к БД:
Base из app.db — общая база моделей Николая.
SessionLocal из app.db — фабрика сессий.
get_db() из app.db выдаёт Session и закрывает её после запроса.
get_db не выполняет автоматический commit.
Изменяющая данные операция сама выполняет commit/rollback.
Таблицы создаются миграциями, не через create_all при старте.

GET /health:
200 {"status":"ok","service":"saxophone-api"}
Не обращается к БД.

GET /ready:
Выполняет SELECT 1.
Успех:
200 {"status":"ok","database":"ok"}
Ошибка БД:
503 {"status":"unavailable"}

HTTP-ошибки:
Сохраняются HTTP-статус и заголовки исключения.
Тело:
{"error":{"code":"http_<статус>","message":"<detail>"}}

Неизвестный маршрут:
404
{"error":{"code":"http_404","message":"Not Found"}}

Ошибки валидации:
Для /auth/* и /users* — 400.
Для остальных маршрутов — 422.
{"error":{"code":"validation_error","message":"Invalid request"}}

Неожиданная ошибка:
500
{"error":{"code":"internal_error","message":"Internal server error"}}

В журнал не записываются тело запроса, пароль, токен
и текст исключения. Записывается тип ошибки.

Серверные пути не содержат /api.
Proxy Вадима убирает этот префикс.

Авторизация:
Маршруты подключаются после готовности router Артёма.
Настройки ключа и срока JWT согласуются при подключении auth.

В эту задачу не входят:
модели пользователя, миграции, регистрация, вход, профиль и выход.