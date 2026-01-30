const { v4: uuidv4 } = require('uuid');

// Generate unique verification token
const generateVerificationToken = () => {
  return uuidv4();
};

// Calculate token expiry time
const getTokenExpiry = () => {
  const hours = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 168; // Default 7 days
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hours);
  return expiryDate;
};

module.exports = {
  generateVerificationToken,
  getTokenExpiry
};