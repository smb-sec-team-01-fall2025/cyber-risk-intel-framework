from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import app
from db.session import get_session
from db.models import Base, AssetTypeEnum, DataSensitivityEnum

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the database tables
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_session] = override_get_db

client = TestClient(app)

def test_create_and_read_asset():
    # Create an asset
    response = client.post(
        "/api/assets",
        json={"name": "test-server-01", "type": AssetTypeEnum.HW.value, "criticality": 3, "data_sensitivity": DataSensitivityEnum.MODERATE.value}
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "test-server-01"
    assert data["risk"]["score"] == 0
    asset_id = data["id"]

    # Read the asset back
    response = client.get(f"/api/assets/{asset_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test-server-01"

def test_update_asset():
    # Create an asset first
    response = client.post(
        "/api/assets",
        json={"name": "test-server-02", "type": AssetTypeEnum.HW.value, "criticality": 3, "data_sensitivity": DataSensitivityEnum.LOW.value}
    )
    assert response.status_code == 201, response.text
    asset_id = response.json()["id"]

    # Update the asset
    response = client.put(
        f"/api/assets/{asset_id}",
        json={"owner": "new-owner", "criticality": 5}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["owner"] == "new-owner"
    assert data["criticality"] == 5

def test_delete_asset():
    # Create an asset to delete
    response = client.post(
        "/api/assets",
        json={"name": "test-server-03", "type": AssetTypeEnum.SW.value, "criticality": 1, "data_sensitivity": DataSensitivityEnum.LOW.value}
    )
    assert response.status_code == 201, response.text
    asset_id = response.json()["id"]

    # Delete the asset
    response = client.delete(f"/api/assets/{asset_id}")
    assert response.status_code == 204

    # Verify it's gone
    response = client.get(f"/api/assets/{asset_id}")
    assert response.status_code == 404
