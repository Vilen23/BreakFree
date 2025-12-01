from fastapi import APIRouter, HTTPException, status
from utils import models, email_service
import os

router = APIRouter(prefix="/contact", tags=["contact"])


@router.get("/config-check")
async def check_email_config():
    """
    Check if SMTP configuration is set up (for debugging)
    """
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")

    is_configured = bool(smtp_user and smtp_password)

    return {
        "configured": is_configured,
        "smtp_server": smtp_server,
        "smtp_port": smtp_port,
        "smtp_user_set": bool(smtp_user),
        "smtp_password_set": bool(smtp_password),
        "message": (
            "SMTP is configured"
            if is_configured
            else "SMTP credentials are missing. Please set SMTP_USER and SMTP_PASSWORD in your .env file."
        ),
    }


@router.post("/send", response_model=models.ContactFormResponse)
async def send_contact_message(contact_data: models.ContactFormRequest):
    """
    Send contact form message via email to breakfree337@gmail.com
    """
    try:
        success, error_message = email_service.send_contact_email(
            sender_name=contact_data.name,
            sender_email=contact_data.email,
            message=contact_data.message,
        )

        if success:
            return {
                "success": True,
                "message": "Your message has been sent successfully. We'll get back to you soon!",
            }
        else:
            # Log the detailed error for debugging
            print(f"Failed to send contact email: {error_message}")
            # Return user-friendly message, but log the actual error
            return {
                "success": False,
                "message": "We encountered an issue sending your message. Please try again later or contact us directly.",
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing contact form: {str(e)}",
        )
