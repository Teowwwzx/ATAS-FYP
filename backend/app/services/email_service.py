import resend
from app.core.config import settings
import logging
from typing import Optional
from app.models.event_model import Event, EventParticipantRole
from datetime import datetime
from app.models.event_model import EventProposal

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY


def _format_dt(dt: datetime) -> str:
    try:
        if dt.tzinfo:
            return dt.strftime("%b %d, %Y %H:%M %Z")
        return dt.strftime("%b %d, %Y %H:%M")
    except Exception:
        return str(dt)


def _wrap_html(title: str, inner_html: str) -> str:
    return (
        "<div style=\"background:#f6f9fc;padding:24px;font-family:Arial,Helvetica,sans-serif;\">"
        "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);\">"
        "<div style=\"background:#0f172a;color:#ffffff;padding:16px 24px;\">"
        f"<h2 style=\"margin:0;font-size:18px;\">{title}</h2>"
        "</div>"
        "<div style=\"padding:24px;color:#0f172a;\">"
        f"{inner_html}"
        "</div>"
        "<div style=\"padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;\">"
        "ATAS • This is an automated message."
        "</div>"
        "</div>"
        "</div>"
    )

def send_verification_email(email: str, token: str):
    verification_link = f"http://localhost:3000/verify-email?token={token}"
    html = _wrap_html(
        "Verify your email",
        (
            f"<p style=\"margin:0 0 12px;\">Please verify your email address to activate your account.</p>"
            f"<a href=\"{verification_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">Verify Email</a>"
            f"<p style=\"margin:12px 0 0;color:#6b7280;font-size:12px;\">If the button doesn’t work, copy and paste this link: <br/><span style=\"word-break:break-all;\">{verification_link}</span></p>"
        ),
    )
    params = {"from": settings.SENDER_EMAIL, "to": [email], "subject": "Verify your email address", "html": html}
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending verification email to {email}: {e}")

def send_password_reset_email(email: str, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    html = _wrap_html(
        "Reset your password",
        (
            f"<p style=\"margin:0 0 12px;\">Click the button to reset your password.</p>"
            f"<a href=\"{reset_link}\" style=\"display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">Reset Password</a>"
            f"<p style=\"margin:12px 0 0;color:#6b7280;font-size:12px;\">If the button doesn’t work, copy and paste this link: <br/><span style=\"word-break:break-all;\">{reset_link}</span></p>"
        ),
    )
    params = {"from": settings.SENDER_EMAIL, "to": [email], "subject": "Reset your password", "html": html}
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending password reset email to {email}: {e}")


def send_event_joined_email(email: str, event: Event):
    """Send a confirmation email when a user joins a public event."""
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"You're registered: {event.title}"
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">Thank you for registering for <strong>{event.title}</strong>.</p>"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending event joined email to {email} for event {event.id}: {e}")


def send_event_invitation_email(email: str, event: Event, role: EventParticipantRole, description: Optional[str] = None):
    """Send an invitation email to a participant for an event."""
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"You're invited: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">You are invited to <strong>{event.title}</strong> as <strong>{role.value}</strong>.</p>"
            f"{desc_html}"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending event invitation email to {email} for event {event.id}: {e}")


def send_event_role_update_email(email: str, event: Event, new_role: EventParticipantRole, description: Optional[str] = None):
    """Notify a participant that their role has been updated for an event."""
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"Your role was updated for: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">Your role for <strong>{event.title}</strong> is now <strong>{new_role.value}</strong>.</p>"
            f"{desc_html}"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending event role update email to {email} for event {event.id}: {e}")


def send_event_removed_email(email: str, event: Event, description: Optional[str] = None):
    """Notify a participant that they have been removed from an event."""
    subject = f"You have been removed from: {event.title}"
    desc_html = f"<p style=\"margin:0 0 12px;\">{description}</p>" if description else ""
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0;\">Your participation in <strong>{event.title}</strong> has been removed by the organizer.</p>"
            f"{desc_html}"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending event removal email to {email} for event {event.id}: {e}")


def send_event_reminder_email(email: str, event: Event, when_label: str):
    """Send a reminder email for an upcoming event.
    when_label examples: "one_week", "three_days", "one_day".
    """
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"Reminder: {event.title} starts soon"
    pretty_when = {
        "one_week": "1 week before",
        "three_days": "3 days before",
        "one_day": "1 day before",
    }.get(when_label, "Upcoming")
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">This is your reminder ({pretty_when}).</p>"
            f"<p style=\"margin:0 0 16px;\"><strong>Starts:</strong> {_format_dt(event.start_datetime)}</p>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending event reminder email to {email} for event {event.id}: {e}")


def send_event_proposal_comment_email(email: str, event: Event, proposal: EventProposal, comment_content: str):
    """Notify proposal owner of a new comment."""
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"New comment on your proposal: {event.title}"
    html = _wrap_html(
        subject,
        (
            f"<p style=\"margin:0 0 12px;\">A new comment was added to your proposal for <strong>{event.title}</strong>.</p>"
            f"<blockquote style=\"margin:0 0 16px;padding:12px;border-left:3px solid #e5e7eb;color:#334155;\">{comment_content}</blockquote>"
            f"<a href=\"{event_link}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;\">View Event</a>"
        ),
    )
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending proposal comment email to {email} for event {event.id}: {e}")
