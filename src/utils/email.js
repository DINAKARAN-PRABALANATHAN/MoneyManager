import emailjs from '@emailjs/browser'

// EmailJS Configuration
// Get these from https://www.emailjs.com/
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'

export const sendFamilyInviteEmail = async (toEmail, inviterName, familyName) => {
  // Skip if not configured
  if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.log('EmailJS not configured. Invite saved but email not sent.')
    return false
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: toEmail,
        inviter_name: inviterName,
        family_name: familyName,
        app_url: window.location.origin
      },
      EMAILJS_PUBLIC_KEY
    )
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}
