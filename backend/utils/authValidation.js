const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
const normalizeIndianMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};
const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password);

const validateRegistration = ({ fullName, username, email, phone, password }) => {
  const cleanName = String(fullName || '').trim();
  const cleanUsername = normalizeUsername(username);
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizeIndianMobile(phone);

  if (cleanName.length < 2 || cleanName.length > 100) {
    return { error: 'Full name must be between 2 and 100 characters.' };
  }
  if (!USERNAME_PATTERN.test(cleanUsername)) {
    return { error: 'Username must be 3-30 characters and use only letters, numbers, or underscores.' };
  }
  if (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (!INDIAN_MOBILE_PATTERN.test(cleanPhone)) {
    return { error: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' };
  }
  if (!isStrongPassword(password)) {
    return { error: 'Password must be 8-128 characters and include uppercase, lowercase, and numeric characters.' };
  }

  return {
    value: {
      fullName: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      password
    }
  };
};

module.exports = {
  EMAIL_PATTERN,
  INDIAN_MOBILE_PATTERN,
  normalizeEmail,
  normalizeUsername,
  normalizeIndianMobile,
  isStrongPassword,
  validateRegistration
};
