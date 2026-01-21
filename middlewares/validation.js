/**
 * Validation middleware for request data
 */

/**
 * Validate wallet address format
 * @param {string} address - Wallet address to validate
 * @returns {boolean} True if valid
 */
const isValidWalletAddress = (address) => {
  if (!address || typeof address !== "string") {
    return false;
  }
  // Ethereum/BSC address format: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash format
 * @param {string} txHash - Transaction hash to validate
 * @returns {boolean} True if valid
 */
const isValidTxHash = (txHash) => {
  if (!txHash || typeof txHash !== "string") {
    return false;
  }
  // Transaction hash format: 0x followed by 64 hex characters
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
};

/**
 * Validate USDT amount
 * @param {number|string} amount - Amount to validate
 * @returns {boolean} True if valid
 */
const isValidUSDTAmount = (amount) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M USDT
};

/**
 * Middleware to validate wallet address
 */
const validateWalletAddress = (req, res, next) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      message: "Wallet address is required",
    });
  }

  if (!isValidWalletAddress(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: "Invalid wallet address format",
    });
  }

  next();
};

/**
 * Middleware to validate transaction hash
 */
const validateTxHash = (req, res, next) => {
  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({
      success: false,
      message: "Transaction hash is required",
    });
  }

  if (!isValidTxHash(txHash)) {
    return res.status(400).json({
      success: false,
      message: "Invalid transaction hash format",
    });
  }

  next();
};

/**
 * Middleware to validate USDT amount
 */
const validateUSDTAmount = (req, res, next) => {
  const { amount } = req.body;

  if (amount !== undefined && !isValidUSDTAmount(amount)) {
    return res.status(400).json({
      success: false,
      message: "Invalid USDT amount. Must be a positive number.",
    });
  }

  next();
};

module.exports = {
  isValidWalletAddress,
  isValidTxHash,
  isValidUSDTAmount,
  validateWalletAddress,
  validateTxHash,
  validateUSDTAmount,
};
