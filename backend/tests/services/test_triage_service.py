from app.services.triage_service import evaluate_symptoms_and_route
from app.schemas.symptom_intake import SymptomIntakeCreate
from unittest.mock import Mock, patch

@patch("app.services.triage_service.get_least_loaded_practitioner")
def test_evaluate_symptoms_and_route_chest_pain(mock_get_least):
    mock_get_least.return_value = "mock_id"
    symptom_intake = SymptomIntakeCreate(
        raw_text="I have chest pain",
        symptoms=["chest pain"],
        severity="Severe",
        duration="1-3 days"
    )
    mock_db = Mock()
    
    result = evaluate_symptoms_and_route(mock_db, symptom_intake)
    assert result["specialty_category"] == "Cardiology"
    assert result["triage_priority"] == "Critical"

@patch("app.services.triage_service.get_least_loaded_practitioner")
def test_evaluate_symptoms_and_route_pediatric(mock_get_least):
    mock_get_least.return_value = "mock_id"
    symptom_intake = SymptomIntakeCreate(
        raw_text="My baby is crying",
        symptoms=["pediatric concern"],
        severity="Moderate",
        duration="1-3 days"
    )
    mock_db = Mock()
    result = evaluate_symptoms_and_route(mock_db, symptom_intake)
    assert result["specialty_category"] == "Pediatrics"
    assert result["triage_priority"] == "Standard"

@patch("app.services.triage_service.get_least_loaded_practitioner")
def test_evaluate_symptoms_and_route_unknown(mock_get_least):
    mock_get_least.return_value = "mock_id"
    symptom_intake = SymptomIntakeCreate(
        raw_text="I feel a bit weird",
        symptoms=["general discomfort"],
        severity="Mild",
        duration="1 week"
    )
    mock_db = Mock()
    result = evaluate_symptoms_and_route(mock_db, symptom_intake)
    assert result["specialty_category"] == "General Medicine"
    assert result["triage_priority"] == "Standard"
