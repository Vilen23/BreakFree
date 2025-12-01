import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple


def send_contact_email(
    sender_name: str,
    sender_email: str,
    message: str,
    recipient_email: str = "breakfree337@gmail.com",
) -> Tuple[bool, Optional[str]]:
    """
    Send contact form email using SMTP.

    Args:
        sender_name: Name of the person sending the message
        sender_email: Email of the person sending the message
        message: The message content
        recipient_email: Email address to send to (default: breakfree337@gmail.com)

    Returns:
        Tuple[bool, Optional[str]]: (success, error_message)
        - success: True if email was sent successfully, False otherwise
        - error_message: Error description if failed, None if successful
    """
    try:
        # Get SMTP settings from environment variables or use defaults
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")

        # If no SMTP credentials are set, we can't send emails
        if not smtp_user or not smtp_password:
            error_msg = "SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables."
            print(f"Warning: {error_msg}")
            return False, error_msg

        # Create message
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = recipient_email
        msg["Subject"] = f"Contact Form Message from {sender_name}"
        msg["Reply-To"] = sender_email

        # Create email body
        body = f"""
New contact form submission from BreakFree website:

Name: {sender_name}
Email: {sender_email}

Message:
{message}

---
You can reply directly to this email to respond to {sender_name} at {sender_email}
"""

        msg.attach(MIMEText(body, "plain"))

        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        print(f"Email sent successfully to {recipient_email} from {sender_email}")
        return True, None

    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP authentication failed: {str(e)}. Please check your SMTP_USER and SMTP_PASSWORD."
        print(f"Error: {error_msg}")
        return False, error_msg
    except smtplib.SMTPException as e:
        error_msg = f"SMTP error: {str(e)}"
        print(f"Error: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Unexpected error sending email: {str(e)}"
        print(f"Error: {error_msg}")
        return False, error_msg
