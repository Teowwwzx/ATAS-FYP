from fastapi import APIRouter, Depends
from app.schemas.ai_schema import ProposalRequest, ProposalResponse
from app.dependencies import get_current_user
from app.models.user_model import User

router = APIRouter()

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
