from pydantic import BaseModel
from typing import Optional

class ProposalRequest(BaseModel):
    topic: str
    expert_name: str
    student_name: Optional[str] = None

class ProposalResponse(BaseModel):
    title: str
    description: str
