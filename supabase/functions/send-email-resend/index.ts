/**
 * Supabase Edge Function for sending emails via Resend API
 * Includes comprehensive email validation and error handling
 */

// Email validation regex pattern (same as frontend for consistency)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
// Maximum email length according to RFC standards
const MAX_EMAIL_LENGTH = 254;

// Default sender email
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "onboarding@resend.dev";

// Blocked domains for temporary email services
const BLOCKED_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc'
];

/**
 * Validates email address
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
function validateEmail(email: string): boolean {
  if (!email) return false;

  const trimmedEmail = email.trim();
  if (!trimmedEmail) return false;

  if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // Check blocked domains
  const domain = trimmedEmail.split('@')[1]?.toLowerCase();
  if (domain && BLOCKED_DOMAINS.includes(domain)) {
    return false;
  }

  return true;
}

/**
 * Validates email request payload
 * @param payload - Email request payload
 * @returns validation result with error message if invalid
 */
function validateEmailRequest(payload: any): { valid: boolean; error?: string } {
  const { to, subject, html, text } = payload;

  // Validate required fields
  if (!to) {
    return { valid: false, error: "Missing 'to' field" };
  }

  // Validate email format
  if (!validateEmail(to)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Validate subject
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return { valid: false, error: "Invalid or missing 'subject' field" };
  }

  // Validate content - at least one of html or text must be provided
  if (!html && !text) {
    return { valid: false, error: "Missing email content (html or text required)" };
  }

  // Validate content length
  if (html && html.length > 50000) {
    return { valid: false, error: "HTML content too long (max 50000 characters)" };
  }

  if (text && text.length > 50000) {
    return { valid: false, error: "Text content too long (max 50000 characters)" };
  }

  return { valid: true };
}

/**
 * Sends email via Resend API
 * @param payload - Validated email payload
 * @returns Response with send result
 */
async function sendWithResend(payload: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<Response> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  // Check if API key is configured
  if (!RESEND_API_KEY) {
    return new Response("Missing RESEND_API_KEY environment variable", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        `Resend API error: ${response.status} - ${errorText}`,
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      `Failed to send email: ${error.message}`,
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Main Edge Function handler
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request body
    const payload = await req.json();

    // Validate the email request
    const validation = validateEmailRequest(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Send email via Resend
    return await sendWithResend(payload);

  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Invalid request: ${error.message}` }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// Export for testing
export { validateEmail, validateEmailRequest, sendWithResend };