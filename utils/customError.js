class CustomError extends Error {
    constructor(statusCode, message) {
      super();
      this.statusCode = statusCode || 200;
      this.message = message;
    }
  }

  const handleError = (err, res) => {
    // Extract statusCode and message, with defaults
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(statusCode).json({
      status: "error",
      statusCode,
      message
    });
  };

  module.exports = {
    CustomError,
    handleError
  };
