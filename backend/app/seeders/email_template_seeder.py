from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import json
from app.models.email_template_model import EmailTemplate as EmailTemplateModel


def seed_default_email_templates(db: Session) -> None:
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    defaults = [
        {
            "name": "email_verification",
            "subject": "Verify your email",
            "body_html": '<p>Hello {{user_name}},</p><p>Please verify your email by clicking <a href="{{verification_link}}">this link</a>.</p>',
            "variables": ["user_name", "verification_link"],
        },
        {
            "name": "forgot_password",
            "subject": "Reset your password",
            "body_html": '<p>Hello {{user_name}},</p><p>Reset your password using <a href="{{reset_link}}">this link</a>.</p>',
            "variables": ["user_name", "reset_link"],
        },
        {
            "name": "moderation_notice",
            "subject": "Your event has an update",
            "body_html": '<p>Hello {{user_name}},</p><p>Your event "{{event_title}}" has been reviewed by our team.</p><p>Reason: {{reason}}</p>',
            "variables": ["user_name", "event_title", "reason"],
        },
    ]
    for d in defaults:
        existing = (
            db.query(EmailTemplateModel)
            .filter(func.lower(EmailTemplateModel.name) == func.lower(d["name"]))
            .first()
        )
        if existing is None:
            item = EmailTemplateModel(
                name=d["name"],
                subject=d["subject"],
                body_html=d["body_html"],
                variables=json.dumps(d["variables"]),
                created_at=now,
            )
            db.add(item)
    db.commit()

