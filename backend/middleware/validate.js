const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Run express-validator checks and throw if errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join(', ');
    throw ApiError.badRequest(messages);
  }
  next();
};

module.exports = validate;