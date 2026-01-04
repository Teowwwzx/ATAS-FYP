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
    """Generate AI-powered expert invitation proposal using Gemini"""
    
    name = req.student_name or current_user.email
    
    # Use Gemini AI for intelligent proposal generation
    prompt = f"""You are an expert academic event coordinator. Generate a professional and persuasive invitation email to invite an expert speaker.

Expert Name: {req.expert_name}
Topic: {req.topic}
Student/Organizer Name: {name}

Create a warm, professional invitation that:
1. Introduces the event organizer
2. Explains why this expert is specifically chosen
3. Describes the topic and its importance
4. Includes a tentative agenda (Introduction, Main Talk, Q&A)
5. Expresses enthusiasm and respect for the expert's time

Format the response as a complete email that can be sent directly.
Keep it concise (200-300 words) but impactful."""

    try:
        result = generate_simple_content(prompt)
        
        # Extract title from first line or generate one
        lines = result.split('\n')
        title = f"Invitation: Speaking Opportunity on {req.topic}"
        
        # If Gemini included a subject line, use it
        if lines and ('subject' in lines[0].lower() or 'invitation' in lines[0].lower()):
            title = lines[0].replace('Subject:', '').replace('subject:', '').strip()
            result = '\n'.join(lines[1:]).strip()
        
        return ProposalResponse(title=title, description=result)
        
    except Exception as e:
        # Fallback to enhanced template if AI fails
        print(f"AI proposal generation failed: {e}")
        template = (f"Dear {req.expert_name},\n\n"
                   f"I am {name}, and I am writing to invite you to share your expertise at our upcoming event.\n\n"
                   f"We are organizing a session on '{req.topic}' and believe your insights would be invaluable "
                   f"to our audience. Your experience and knowledge in this area make you the ideal speaker.\n\n"
                   f"**Proposed Agenda:**\n"
                   f"• Introduction & Welcome (5 minutes)\n"
                   f"• Keynote: {req.topic} (40 minutes)\n"
                   f"• Interactive Q&A Session (15 minutes)\n\n"
                   f"We would be honored by your participation and look forward to your positive response.\n\n"
                   f"Warm regards,\n{name}")
        
        return ProposalResponse(title=f"Invitation to speak on {req.topic}", description=template)
