import pytest
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.skill_model import Skill

def test_create_skill(db: Session):
    """Test creating a skill"""
    skill = Skill(name="Rust")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    assert skill.id is not None
    assert skill.name == "Rust"

def test_skill_uniqueness(db: Session):
    """Test skill name uniqueness"""
    # Create first
    skill1 = Skill(name="JavaScript")
    db.add(skill1)
    db.commit()

    # Create second with same name
    skill2 = Skill(name="JavaScript")
    db.add(skill2)
    
    with pytest.raises(IntegrityError):
        db.commit()
    
    db.rollback()
