from fastapi import APIRouter, Depends, BackgroundTasks, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from app.services.socket_manager import notify_user, broadcast_to_post
from app.database.session import get_session
from app.models.community_model import Comment, Post
from app.schemas.comment import CommentCreate, CommentResponse
from app.core.config import settings
from app.services.moderation import is_text_allowed

router = APIRouter(tags=["comments"])

def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    return payload.get("sub")

@router.post("/comments", response_model=CommentResponse)
async def create_comment(
    comment_data: CommentCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    if not is_text_allowed(comment_data.content):
        raise HTTPException(status_code=400, detail="Content not allowed")
    root_id = comment_data.parent_id
    if root_id:
        res = await session.execute(select(Comment).where(Comment.id == root_id))
        parent = res.scalar_one_or_none()
        if parent and parent.root_id:
            root_id = parent.root_id
    new_comment = Comment(
        content=comment_data.content,
        post_id=comment_data.post_id,
        user_id=user_id,
        parent_id=comment_data.parent_id,
        root_id=root_id,
    )
    session.add(new_comment)
    await session.commit()
    background_tasks.add_task(
        broadcast_to_post,
        str(comment_data.post_id),
        {"user": str(user_id), "content": comment_data.content},
    )
    res_post = await session.execute(select(Post).where(Post.id == comment_data.post_id))
    post = res_post.scalar_one_or_none()
    if post and str(post.user_id) != str(user_id):
        background_tasks.add_task(
            notify_user,
            str(post.user_id),
            "new_reply",
            {"message": "新评论", "post_id": str(post.id)},
        )
    return CommentResponse(
        id=str(new_comment.id),
        post_id=str(new_comment.post_id),
        content=new_comment.content,
        parent_id=str(new_comment.parent_id) if new_comment.parent_id else None,
        root_id=str(new_comment.root_id) if new_comment.root_id else None,
    )

@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def list_post_comments(post_id: str, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Comment).where(Comment.post_id == post_id))
    comments = res.scalars().all()
    return [
        CommentResponse(
            id=str(c.id),
            post_id=str(c.post_id),
            content=c.content,
            parent_id=str(c.parent_id) if c.parent_id else None,
            root_id=str(c.root_id) if c.root_id else None,
        ) for c in comments
    ]
