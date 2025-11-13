import resend
from app.core.config import settings
import logging
from typing import Optional
from app.models.event_model import Event, EventParticipantRole

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY

def send_verification_email(email: str, token: str):
    verification_link = f"http://localhost:3000/verify-email?token={token}"
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": "Verify your email address",
        "html": f"<p>Please click the link below to verify your email address:</p><a href='{verification_link}'>{verification_link}</a>",
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending verification email to {email}: {e}")

def send_password_reset_email(email: str, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    params = {
        "from": settings.SENDER_EMAIL,
        "to": [email],
        "subject": "Reset your password",
        "html": f"<p>Please click the link below to reset your password:</p><a href='{reset_link}'>{reset_link}</a>",
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Error sending password reset email to {email}: {e}")


def send_event_joined_email(email: str, event: Event):
    """Send a confirmation email when a user joins a public event."""
    event_link = f"http://localhost:3000/main/events/{event.id}"
    subject = f"You're registered: {event.title}"
    html = (
        f"<h3>{subject}</h3>"
        f"<p>Thank you for registering for '<strong>{event.title}</strong>'.</p>"
        f"<p>Starts at: {event.start_datetime}</p>"
        f"<p>View details: <a href='{event_link}'>{event_link}</a></p>"
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
    desc_html = f"<p>{description}</p>" if description else ""
    html = (
        f"<h3>{subject}</h3>"
        f"<p>You have been invited to '{event.title}' as <strong>{role.value}</strong>.</p>"
        f"{desc_html}"
        f"<p>Event starts at: {event.start_datetime} (timezone-aware)</p>"
        f"<p>View details: <a href='{event_link}'>{event_link}</a></p>"
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
    desc_html = f"<p>{description}</p>" if description else ""
    html = (
        f"<h3>{subject}</h3>"
        f"<p>Your role for '{event.title}' is now <strong>{new_role.value}</strong>.</p>"
        f"{desc_html}"
        f"<p>Event starts at: {event.start_datetime} (timezone-aware)</p>"
        f"<p>View details: <a href='{event_link}'>{event_link}</a></p>"
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
    desc_html = f"<p>{description}</p>" if description else ""
    html = (
        f"<h3>{subject}</h3>"
        f"<p>Your participation in '{event.title}' has been removed by the organizer.</p>"
        f"{desc_html}"
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
    html = (
        f"<h3>{subject}</h3>"
        f"<p>This is your reminder ({pretty_when}).</p>"
        f"<p>Starts at: {event.start_datetime}</p>"
        f"<p>View details: <a href='{event_link}'>{event_link}</a></p>"
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