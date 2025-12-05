
import pytest
from unittest.mock import patch, MagicMock
import os
import json
from app.services.ai_service import generate_proposal

@patch("app.services.ai_service.os.getenv")
@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_generate_proposal_gemini_success(mock_configure, mock_model_cls, mock_getenv):
    # Setup Mocks
    mock_getenv.side_effect = lambda k, d=None: "gemini" if k == "AI_PROVIDER" else ("fake_key" if k == "GEMINI_API_KEY" else d)
    
    mock_model_instance = MagicMock()
    mock_model_cls.return_value = mock_model_instance
    
    expected_response = {
        "title": "AI Generated Proposal",
        "short_intro": "Intro",
        "value_points": ["Value"],
        "logistics": "Logistics",
        "closing": "Closing",
        "email_subjects": ["Subject"],
        "raw_text": "Complete Text"
    }
    
    mock_response = MagicMock()
    mock_response.text = json.dumps(expected_response)
    mock_model_instance.generate_content.return_value = mock_response

    # Test Data
    event = {
        "title": "Test Event",
        "description": "Description",
        "start_datetime": "2024-01-01",
        "end_datetime": "2024-01-01",
        "format": "webinar",
        "type": "online"
    }
    options = {"tone": "professional"}
    
    # Execute
    result = generate_proposal(event, {}, options)
    
    # Assert
    assert result == expected_response
    mock_configure.assert_called_with(api_key="fake_key")
    mock_model_instance.generate_content.assert_called_once()

@patch("app.services.ai_service.os.getenv")
def test_generate_proposal_fallback_no_key(mock_getenv):
    # Setup Mocks to simulate missing key
    mock_getenv.side_effect = lambda k, d=None: "gemini" if k == "AI_PROVIDER" else (None if k == "GEMINI_API_KEY" else d)
    
    event = {"title": "Test Event"}
    
    # Execute
    result = generate_proposal(event, {}, {})
    
    # Assert
    assert "Proposal: Test Event" in result["title"]
    # Should be the stub response
