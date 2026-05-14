"""
Email Service for Bill Tracker
Handles email verification and password reset emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

# Email configuration
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', 'billtracker@example.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'Bill Tracker <noreply@billtracker.com>')
APP_URL = os.environ.get('APP_URL', 'https://cash-flow-hub-81.preview.emergentagent.com')

def send_verification_email(to_email: str, name: str, verification_token: str) -> bool:
    """Send email verification link"""
    try:
        verification_link = f"{APP_URL}/verify-email?token={verification_token}"
        
        subject = "Verify Your Bill Tracker Account"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #007AFF; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Bill Tracker</h1>
                </div>
                <div class="content">
                    <h2>Welcome, {name}!</h2>
                    <p>Thank you for registering with Bill Tracker. We're excited to help you manage your bills!</p>
                    <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                    <center>
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </center>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: #fff; padding: 10px; border-left: 3px solid #007AFF; word-break: break-all;">
                        {verification_link}
                    </p>
                    <p><strong>This link will expire in 24 hours.</strong></p>
                    <p>If you didn't create this account, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        <strong>Security Tip:</strong> Never share your password or verification link with anyone.
                    </p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Bill Tracker. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to Bill Tracker, {name}!
        
        Thank you for registering. To complete your registration, please verify your email address.
        
        Click this link to verify: {verification_link}
        
        This link will expire in 24 hours.
        
        If you didn't create this account, please ignore this email.
        
        (c) 2026 Bill Tracker
        """
        
        return send_email(to_email, subject, html_body, text_body)
        
    except Exception as e:
        logger.error(f"Error sending verification email: {e}")
        return False


def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    """Send password reset link"""
    try:
        reset_link = f"{APP_URL}/reset-password?token={reset_token}"
        
        subject = "Reset Your Bill Tracker Password"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #FF3B30; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #FF3B30; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                .warning {{ background: #fff3cd; border-left: 3px solid #ffc107; padding: 10px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset</h1>
                </div>
                <div class="content">
                    <h2>Hello, {name}</h2>
                    <p>We received a request to reset your Bill Tracker password.</p>
                    <p>Click the button below to create a new password:</p>
                    <center>
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </center>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: #fff; padding: 10px; border-left: 3px solid #FF3B30; word-break: break-all;">
                        {reset_link}
                    </p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <div class="warning">
                        <strong>Didn't request this?</strong><br>
                        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        <strong>Security Tip:</strong> Bill Tracker will never ask you for your password via email.
                    </p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Bill Tracker. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Hello {name},
        
        We received a request to reset your Bill Tracker password.
        
        Click this link to reset your password: {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        
        (c) 2026 Bill Tracker
        """
        
        return send_email(to_email, subject, html_body, text_body)
        
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        return False


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Generic email sending function"""
    try:
        # For development/demo: Just log the email instead of actually sending
        # In production, uncomment the SMTP code below
        
        logger.info(f"EMAIL SIMULATION (not actually sent):")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body preview: {text_body[:200]}...")
        
        # In a production environment, you would:
        # 1. Set up SMTP credentials in environment variables
        # 2. Uncomment the code below
        # 3. Use a service like SendGrid, AWS SES, or Gmail SMTP
        
        """
        # Production SMTP code (currently disabled for demo):
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect to SMTP server
        if SMTP_PASSWORD:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent successfully to {to_email}")
        else:
            logger.warning("SMTP not configured - email not sent")
        """
        
        # For demo: Return True (email "sent")
        return True
        
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False
