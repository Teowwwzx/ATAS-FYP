from pydantic import BaseModel
from typing import List, Optional


class ProposalSuggestRequest(BaseModel):
    tone: Optional[str] = None
    length_hint: Optional[str] = None
    audience_level: Optional[str] = None
    language: Optional[str] = None
    sections: Optional[List[str]] = None
    expert_id: Optional[str] = None


class ProposalSuggestResponse(BaseModel):
    title: str
    short_intro: str
    value_points: List[str]
    logistics: str
    closing: str
    email_subjects: List[str]
    raw_text: str
