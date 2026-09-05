/**
 * Simple request body validator.
 * Usage: validate(['field1', 'field2'])
 */
const validate = (requiredFields) => (req, res, next) => {
  const missing = requiredFields.filter((f) => {
    const val = req.body[f];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    });
  }
  next();
};

module.exports = { validate };
