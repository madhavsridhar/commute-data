export function errorHandler(err, req, res, next) {
    console.error(err.stack);
  
    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.message
      });
    }
  
    if (err.name === 'MongoError' && err.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate Entry',
        details: 'This record already exists'
      });
    }
  
    // Default error response
    res.status(500).json({
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  }