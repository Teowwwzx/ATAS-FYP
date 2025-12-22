from fastapi import APIRouter, Depends, Body
from app.schemas.ai_schema import ProposalRequest, ProposalResponse
from app.dependencies import get_current_user
from app.models.user_model import User
from app.services.ai_service import generate_simple_content
from pydantic import BaseModel

router = APIRouter()

class TextGenerationRequest(BaseModel):
    prompt: str
    context: str | None = None

class TextGenerationResponse(BaseModel):
    result: str

@router.post("/generate-text", response_model=TextGenerationResponse)
def generate_ai_text(
    req: TextGenerationRequest, 
    current_user: User = Depends(get_current_user)
):
    full_prompt = req.prompt
    if req.context:
        full_prompt += f"\n\nContext:\n{req.context}"
    
    result = generate_simple_content(full_prompt)
    return TextGenerationResponse(result=result)

@router.post("/generate-proposal", response_model=ProposalResponse)
def generate_proposal(req: ProposalRequest, current_user: User = Depends(get_current_user)):
    # Basic template proposal
    name = req.student_name or current_user.email
    template = (f"Dear {req.expert_name},\n\n"
                f"I am writing to invite you to speak at our event about '{req.topic}'. "
                f"We believe your expertise would be invaluable to our students.\n\n"
                f"Tentative Agenda:\n"
                f"1. Introduction (5 mins)\n"
                f"2. Talk on {req.topic} (40 mins)\n"
                f"3. Q&A (15 mins)\n\n"
                f"Looking forward to your positive response.\n\n"
                f"Best regards,\n{name}")
    
    return ProposalResponse(title=f"Invitation to speak on {req.topic}", description=template)
