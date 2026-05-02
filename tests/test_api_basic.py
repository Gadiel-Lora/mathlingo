from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_grades():
    response = client.get("/api/academic/curriculum")
    assert response.status_code == 200
    data = response.json()
    assert "grades" in data
    assert isinstance(data["grades"], list)
    assert len(data["grades"]) > 0
