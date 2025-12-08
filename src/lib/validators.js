/**
 * Email validation utilities for frontend
 * Provides consistent email validation across the application
 */

// Email validation regex pattern - more strict to prevent invalid formats
// Prevents double dots, trailing dots, and other invalid patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

// Maximum email length according to RFC standards
const MAX_EMAIL_LENGTH = 254;

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
export const validateEmail = (email) => {
  // Check if email exists and is a string
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace and check if empty
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return false;
  }

  // Check regex pattern and length
  if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // Check blocked domains
  const domain = trimmedEmail.split('@')[1]?.toLowerCase();
  if (domain && DEFAULT_BLOCKED_DOMAINS.includes(domain)) {
    return false;
  }

  return true;
};

/**
 * Validates email with detailed error information
 * @param {string} email - The email address to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateEmailWithDetails = (email) => {
  // Check if email exists and is a string
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  // Trim whitespace
  const trimmedEmail = email.trim();

  // Check if empty after trimming
  if (!trimmedEmail) {
    return {
      isValid: false,
      error: 'Email cannot be empty'
    };
  }

  // Check length
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return {
      isValid: false,
      error: `Email is too long (max ${MAX_EMAIL_LENGTH} characters)`
    };
  }

  // Check regex pattern
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  // Email is valid
  return {
    isValid: true,
    error: null
  };
};

/**
 * Validates multiple email addresses
 * @param {string|string[]} emails - Email or array of emails to validate
 * @returns {boolean} - True if all emails are valid
 */
export const validateMultipleEmails = (emails) => {
  if (!emails) {
    return false;
  }

  const emailArray = Array.isArray(emails) ? emails : [emails];
  return emailArray.every(email => validateEmail(email));
};

/**
 * Validates email with additional business rules
 * @param {string} email - The email address to validate
 * @param {Object} options - Additional validation options
 * @param {string[]} options.blockedDomains - Domains to block
 * @param {number} options.minLength - Minimum email length
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateEmailExtended = (email, options = {}) => {
  const basicValidation = validateEmailWithDetails(email);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const trimmedEmail = email.trim();
  const { blockedDomains = [], minLength = 5 } = options;

  // Check minimum length
  if (trimmedEmail.length < minLength) {
    return {
      isValid: false,
      error: `Email is too short (min ${minLength} characters)`
    };
  }

  // Check blocked domains
  const domain = trimmedEmail.split('@')[1];
  if (domain && blockedDomains.includes(domain.toLowerCase())) {
    return {
      isValid: false,
      error: 'Temporary email addresses are not allowed'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

// Default blocked domains for temporary email services
export const DEFAULT_BLOCKED_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc'
];