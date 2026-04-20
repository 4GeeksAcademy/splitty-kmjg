import os
from flask import current_app, render_template_string
from flask_mail import Message

# Brand Colors (Splitty Obsidian Glass Design)
PRIMARY_ORANGE = "#FF914D"
SECONDARY_ORANGE = "#FF6B00"
BG_DARK = "#121212"
CARD_BG = "#1e1e1e"
TEXT_MUTED = "#a19b95"
TEXT_WHITE = "#ffffff"
FOOTER_TEXT = "#555555"

# Common Header & Style
HTML_TEMPLATE_BASE = f"""
<div style="background-color: {BG_DARK}; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: {TEXT_WHITE}; text-align: center;">
    <div style="max-width: 500px; margin: auto; background-color: {CARD_BG}; padding: 40px; border-radius: 24px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h1 style="color: {PRIMARY_ORANGE}; margin-bottom: 10px; font-size: 32px; font-weight: bold;">Splitty</h1>
        <div style="width: 60px; height: 3px; background: linear-gradient(90deg, {PRIMARY_ORANGE}, {SECONDARY_ORANGE}); margin: 0 auto 30px auto; border-radius: 10px;"></div>
        
        {{{{ content }}}}
        
        <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: {FOOTER_TEXT};">
            © 2026 Splitty App. All rights reserved. <br>
            <span style="font-style: italic;">Share moments, not math.</span>
        </div>
    </div>
</div>
"""

def send_splitty_mail(subject, recipient, template_type, context):
    """
    Centralized email sender for Splitty.
    Supported template_types: 'verification', 'invitation', 'friend_request', 'password_reset'
    context: dict with data for the template
    """
    mail_ext = current_app.extensions.get('mail')
    if not mail_ext:
        current_app.logger.error("Mail extension not found in current_app")
        return False, "Email service not configured"

    content_html = ""
    
    if template_type == 'verification':
        code = context.get('code')
        username = context.get('username')
        link = context.get('link')
        
        content_html = f"""
            <p style="font-size: 18px; line-height: 1.6; color: {TEXT_MUTED}; margin-bottom: 30px;">
                Hi <strong style="color: {TEXT_WHITE};">{username}</strong>, welcome to Splitty!
            </p>
            <p style="font-size: 16px; color: {TEXT_MUTED};">Your verification code is:</p>
            <div style="margin: 30px 0;">
                <span style="background: rgba(255, 145, 77, 0.1); color: {PRIMARY_ORANGE}; padding: 20px 40px; border-radius: 16px; font-weight: bold; font-size: 36px; letter-spacing: 8px; border: 1px solid rgba(255, 145, 77, 0.3); display: inline-block;">
                    {code}
                </span>
            </div>
            """
        if link:
            content_html += f"""
            <p style="font-size: 14px; color: {TEXT_MUTED}; margin: 20px 0;">Or click the button below to verify automatically:</p>
            <div style="margin: 30px 0;">
                <a href="{link}" style="background: linear-gradient(90deg, {PRIMARY_ORANGE}, {SECONDARY_ORANGE}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                    Verify Account
                </a>
            </div>
            """
        content_html += f"""
            <p style="font-size: 13px; color: {FOOTER_TEXT}; margin-top: 30px; line-height: 1.4;">
                This code will expire in 30 minutes. <br>
                If you didn't create an account, you can safely ignore this email.
            </p>
        """

    elif template_type == 'invitation':
        group_name = context.get('group_name')
        link = context.get('link')
        content_html = f"""
            <p style="font-size: 18px; line-height: 1.6; color: {TEXT_MUTED}; margin-bottom: 10px;">
                Hello! You have been invited to join the group:
            </p>
            <p style="color: {TEXT_WHITE}; font-size: 24px; font-weight: 600; margin-bottom: 40px;">{group_name}</p>
            <div style="margin: 40px 0;">
                <a href="{link}" style="background: linear-gradient(90deg, {PRIMARY_ORANGE}, {SECONDARY_ORANGE}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                    Accept Invitation
                </a>
            </div>
            <p style="font-size: 13px; color: {FOOTER_TEXT}; margin-top: 40px; line-height: 1.4;">
                This is a private invitation link. <br>
                If you weren't expecting this email, you can safely ignore it.
            </p>
        """

    elif template_type == 'friend_request':
        inviter_name = context.get('inviter_name')
        link = context.get('link')
        content_html = f"""
            <p style="font-size: 18px; line-height: 1.6; color: {TEXT_MUTED}; margin-bottom: 10px;">
                Hi! <strong style="color: {TEXT_WHITE};">{inviter_name}</strong> wants to add you as a friend:
            </p>
            <div style="margin: 40px 0;">
                <a href="{link}" style="background: linear-gradient(90deg, {PRIMARY_ORANGE}, {SECONDARY_ORANGE}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                    Accept Friend Request
                </a>
            </div>
            <p style="font-size: 13px; color: {FOOTER_TEXT}; margin-top: 40px; line-height: 1.4;">
                This is a private link.<br>
                If you weren't expecting this email, you can safely ignore it.
            </p>
        """

    elif template_type == 'password_reset':
        username = context.get('username')
        link = context.get('link')
        content_html = f"""
            <p style="font-size: 18px; line-height: 1.6; color: {TEXT_MUTED}; margin-bottom: 20px;">
                Hello <strong style="color: {TEXT_WHITE};">{username}</strong>,
            </p>
            <p style="font-size: 16px; color: {TEXT_MUTED};">A password reset was requested for your account.</p>
            <div style="margin: 40px 0;">
                <a href="{link}" style="background: linear-gradient(90deg, {PRIMARY_ORANGE}, {SECONDARY_ORANGE}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 145, 77, 0.3);">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 13px; color: {FOOTER_TEXT}; margin-top: 40px; line-height: 1.4;">
                This link will expire soon. <br>
                If you didn't request this change, you can safely ignore this email.
            </p>
        """

    else:
        return False, f"Unknown template type: {template_type}"

    # Render final HTML
    final_html = render_template_string(HTML_TEMPLATE_BASE, content=content_html)
    
    msg = Message(
        subject=subject,
        recipients=[recipient],
        sender=current_app.config.get('MAIL_USERNAME'),
        html=final_html
    )

    try:
        print(f"[MAIL] Attempting to send '{template_type}' email to: {recipient}")
        current_app.logger.info(f"Sending email to {recipient} with subject '{subject}'")
        
        mail_ext.send(msg)
        
        print(f"[MAIL] SUCCESS: Email sent to {recipient}")
        return True, "Email sent successfully"
    except Exception as e:
        error_detailed = f"Error sending Splitty mail ({template_type}) to {recipient}: {str(e)}"
        print(f"[MAIL] FAILED: {error_detailed}")
        current_app.logger.error(error_detailed)
        import traceback
        traceback.print_exc()
        return False, str(e)
