const { handleError } = require('../utils/customError');

const errorMiddleware = (err, req, res, next) => {
  handleError(err, res);
};

module.exports = errorMiddleware;
