
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc, or_
from typing import List
import uuid

from app.database.database import get_db
from app.models.chat_model import Conversation, ConversationParticipant, Message
from app.models.user_model import User
from app.schemas.chat_schema import ConversationCreate, ConversationResponse, MessageCreate, MessageResponse, ParticipantResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/conversations", response_model=ConversationResponse)
def create_or_get_conversation(
    conv_in: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start a new conversation with a list of users or get existing one.
    Currently only supports 1-to-1 or group chats.
    """
    target_ids = list(set(conv_in.participant_ids))
    
    # Validation: Cannot chat with self alone (unless intended, but usually blocked)
    if len(target_ids) == 1 and target_ids[0] == current_user.id:
         raise HTTPException(status_code=400, detail="Cannot chat with yourself")
    
    # Ensure current user is in the list
    all_participant_ids = set(target_ids)
    all_participant_ids.add(current_user.id)
    sorted_ids = sorted(list(all_participant_ids))
    
    # Check if a conversation with EXACT match of participants exists
    # This is a bit complex in SQL, usually easier to just query 1-on-1s. 
    # For MVP 1-on-1: find convs where this user is part of, then check if other is part of.
    
    # Basic Check for 1-on-1
    if len(sorted_ids) == 2:
        other_user_id = [id for id in sorted_ids if id != current_user.id][0]
        
        # Find existing shared conversation
        existing = db.query(Conversation).join(ConversationParticipant).filter(
            ConversationParticipant.user_id == current_user.id
        ).all()
        
        for conv in existing:
            # Check if other user is also in this conv
            participants = db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == conv.id).all()
            p_ids = sorted([p.user_id for p in participants])
            
            if p_ids == sorted_ids:
                return _format_conversation_response(conv, current_user.id, db)

    # Create new conversation
    new_conv = Conversation()
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    # Add participants
    for uid in sorted_ids:
        participant = ConversationParticipant(conversation_id=new_conv.id, user_id=uid)
        db.add(participant)
    
    db.commit()
    return _format_conversation_response(new_conv, current_user.id, db)


@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all conversations for the current user.
    """
    # 1. Get conversation IDs for the user
    user_convs = db.query(ConversationParticipant.conversation_id)\
        .filter(ConversationParticipant.user_id == current_user.id)\
        .subquery()

    # 2. Get conversations ordered by updated_at
    conversations = db.query(Conversation)\
        .filter(Conversation.id.in_(user_convs))\
        .order_by(desc(Conversation.updated_at))\
        .offset(skip).limit(limit).all()

    return [_format_conversation_response(c, current_user.id, db) for c in conversations]


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify participant
    _check_participant(conversation_id, current_user.id, db)

    messages = db.query(Message)\
        .filter(Message.conversation_id == conversation_id)\
        .order_by(desc(Message.created_at))\
        .offset(skip).limit(limit).all()
        
    # Mark read (simple version: update last_read_at for participant)
    # We don't update individual message is_read usually in this model if we use last_read_at,
    # but let's do simple update for MVP
    
    # Update participant last_read_at
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if participant:
        participant.last_read_at = func.now()
        db.commit()

    return [_format_message_response(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: uuid.UUID,
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify participant
    _check_participant(conversation_id, current_user.id, db)

    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=msg_in.content
    )
    db.add(new_msg)
    
    # Update conversation updated_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    conv.updated_at = func.now()
    
    db.commit()
    db.refresh(new_msg)
    
    return _format_message_response(new_msg)


# --- Helpers ---

def _check_participant(conversation_id: uuid.UUID, user_id: uuid.UUID, db: Session):
    exists = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    if not exists:
        raise HTTPException(status_code=403, detail="Not a participant")

def _format_conversation_response(conv: Conversation, current_user_id: uuid.UUID, db: Session) -> ConversationResponse:
    # Get Participants
    participants_db = db.query(ConversationParticipant).options(joinedload(ConversationParticipant.user).joinedload(User.profile)).filter(
        ConversationParticipant.conversation_id == conv.id
    ).all()
    
    participants_resp = []
    my_last_read = None
    
    for p in participants_db:
        # User details
        u = p.user
        full_name = u.profile.full_name if u.profile else u.email
        avatar_url = u.profile.avatar_url if u.profile else None
        
        participants_resp.append(ParticipantResponse(
            user_id=p.user_id,
            full_name=full_name,
            avatar_url=avatar_url,
            last_read_at=p.last_read_at
        ))
        
        if p.user_id == current_user_id:
            my_last_read = p.last_read_at
            
    # Get Last Message
    last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(desc(Message.created_at)).first()
    last_msg_resp = _format_message_response(last_msg) if last_msg else None
    
    # Count Unread
    unread = 0
    if my_last_read:
        unread = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.created_at > my_last_read,
            Message.sender_id != current_user_id
        ).count()
    elif last_msg: 
        # If never read, all are unread
        unread = db.query(Message).filter(
            Message.conversation_id == conv.id, 
            Message.sender_id != current_user_id
        ).count()

    return ConversationResponse(
        id=conv.id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        participants=participants_resp,
        last_message=last_msg_resp,
        unread_count=unread
    )

def _format_message_response(msg: Message) -> MessageResponse:
    sender_name = None
    sender_avatar = None
    if msg.sender and msg.sender.profile:
        sender_name = msg.sender.profile.full_name
        sender_avatar = msg.sender.profile.avatar_url
    
    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender_name=sender_name,
        sender_avatar=sender_avatar
    )
