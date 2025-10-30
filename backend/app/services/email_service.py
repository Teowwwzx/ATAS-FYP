import resend
from app.core.config import settings

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
        print(f"Error sending email: {e}")

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
        print(f"Error sending email: {e}")