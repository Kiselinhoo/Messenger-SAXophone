from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db import get_db
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok', 'service': 'saxophone-api'}


def test_missing_route(client):
    response = client.get('/missing')
    assert response.status_code == 404
    assert response.json() == {'error': {'code': 'http_404', 'message': 'Not Found'}}


def test_ready_with_database(client):
    database = Mock()
    app.dependency_overrides[get_db] = lambda: database
    response = client.get('/ready')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok', 'database': 'ok'}

    database.execute.assert_called_once()
    statement = database.execute.call_args.args[0]
    assert str(statement) == 'SELECT 1'


def test_ready_without_database(client):
    class UnavailableDB:
        def execute(self, statement):
            raise OperationalError('SELECT 1', {}, Exception('offline'))

    app.dependency_overrides[get_db] = lambda: UnavailableDB()
    response = client.get('/ready')
    assert response.status_code == 503
    assert response.json() == {'status': 'unavailable'}
