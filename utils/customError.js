class CustomError extends Error {
    constructor(statusCode, message) {
      super();
      this.statusCode = statusCode || 200;
      this.message = message;
    }
  }

  const handleError = (err, res) => {
    const { statusCode, message } = err;
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
