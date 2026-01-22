import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Text, DateTime, JSON, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base # 假设你有这个

class Post(Base):
    __tablename__ = "comm_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False) # 发帖人
    
    # 内容
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=True)
    media_urls = Column(JSON, default=[]) # [{"url": "...", "type": "image"}, ...]
    tags = Column(ARRAY(String), default=[]) # ["避雷", "食堂"]
    location = Column(String(100), nullable=True) # "Library Level 3"
    category = Column(String(50), nullable=True)
    extra = Column(JSON, default={})

    # 计数器 (即使有 Redis，数据库也要存一份作为兜底)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    collects_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comm_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("comm_posts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False) # 评论者
    
    content = Column(String(1000), nullable=False)
    likes_count = Column(Integer, default=0)
    
    # --- 核心：楼中楼设计 ---
    # 1. 直接父级 ID (用于 UI 显示 "回复 @某人")
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comm_comments.id"), nullable=True)
    
    # 2. 根评论 ID (优化查询：一次查出所有楼中楼)
    # 如果是第一级评论，root_id 为 NULL 或等于自身 ID
    root_id = Column(UUID(as_uuid=True), ForeignKey("comm_comments.id"), nullable=True)

    # 3. 回复给谁 (方便前端渲染 "Reply to UserB")
    reply_to_user_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    parent = relationship(
        "Comment",
        remote_side=[id],
        foreign_keys=[parent_id],
        back_populates="replies",
    )
    replies = relationship(
        "Comment",
        foreign_keys=[parent_id],
        back_populates="parent",
        cascade="all, delete-orphan",
    )


class Interaction(Base):
    """
    统一管理点赞和收藏，避免建太多的表。
    Type: 'like_post', 'like_comment', 'collect_post'
    """
    __tablename__ = "comm_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False) # 谁点的
    target_id = Column(UUID(as_uuid=True), index=True, nullable=False) # 点了哪个对象 (PostID 或 CommentID)
    target_type = Column(String(20), nullable=False) # "post", "comment"
    action = Column(String(20), nullable=False) # "like", "collect"

    created_at = Column(DateTime, default=datetime.utcnow)

    # 联合索引：保证一个用户对一个内容只能点赞一次
    __table_args__ = (
        Index('idx_user_target_action', 'user_id', 'target_id', 'action', unique=True),
    )
