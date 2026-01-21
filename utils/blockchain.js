const { ethers } = require("ethers");

/**
 * Blockchain verification service for USDT payments on BSC
 * Verifies transactions on-chain to ensure payment authenticity
 * Supports both BSC Mainnet and Testnet
 */

// ============================================
// 🚀 DEV MODE: Set to true for Testnet, false for Mainnet
// ============================================
const USE_TESTNET = true; // 👈 Set to true for Testnet, false for Mainnet
// ============================================

// Network type (mainnet or testnet) - Priority: DEV_MODE > env variable > default
const NETWORK_TYPE = USE_TESTNET ? "testnet" : (process.env.BSC_NETWORK_TYPE || "mainnet");

// BSC Mainnet Configuration
const BSC_MAINNET = {
  rpcUrl: "https://bsc-dataseed1.binance.org/",
  usdtContractAddress: "0x55d398326f99059fF775485246999027B3197955",
  blockExplorer: "https://bscscan.com",
};

// BSC Testnet Configuration
const BSC_TESTNET = {
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  usdtContractAddress: process.env.TESTNET_USDT_CONTRACT || "0xd0584e6f7101e5FB5C13132C42Fa7dFf9e0c0f91",
  blockExplorer: "https://testnet.bscscan.com",
};

// Get current network configuration
const getNetworkConfig = () => {
  return NETWORK_TYPE === "testnet" ? BSC_TESTNET : BSC_MAINNET;
};

// Current network config
const networkConfig = getNetworkConfig();

// Log network in development
if (process.env.NODE_ENV !== "production") {
  console.log(`🌐 Backend using ${NETWORK_TYPE === "testnet" ? "BSC Testnet" : "BSC Mainnet"} (RPC: ${networkConfig.rpcUrl})`);
}

// BSC RPC URL (can be overridden via env, otherwise uses network config)
const BSC_RPC_URL = process.env.BSC_RPC_URL || networkConfig.rpcUrl;

// USDT BEP-20 Contract Address (can be overridden via env, otherwise uses network config)
const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || networkConfig.usdtContractAddress;

// Merchant wallet address (should be set in env)
const MERCHANT_WALLET_ADDRESS = process.env.MERCHANT_WALLET_ADDRESS || "0x839CB6B93e55F5263e7F2Ca13ee828f7E2762f3e";

// USDT has 18 decimals
const USDT_DECIMALS = 18;

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * Initialize BSC provider
 * @returns {ethers.JsonRpcProvider} BSC provider instance
 */
const getProvider = () => {
  return new ethers.JsonRpcProvider(BSC_RPC_URL);
};

/**
 * Get USDT contract instance
 * @param {ethers.JsonRpcProvider} provider - BSC provider
 * @returns {ethers.Contract} USDT contract instance
 */
const getUSDTContract = (provider) => {
  // Minimal ABI for USDT transfer verification
  const usdtABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
  ];

  return new ethers.Contract(USDT_CONTRACT_ADDRESS, usdtABI, provider);
};

/**
 * Verify USDT payment transaction
 * @param {string} txHash - Transaction hash
 * @param {string} expectedAmount - Expected USDT amount (in human-readable format, e.g., "100.5")
 * @param {string} expectedFrom - Expected sender wallet address
 * @returns {Promise<Object>} Verification result
 */
const verifyPayment = async (txHash, expectedAmount, expectedFrom = null) => {
  try {
    const provider = getProvider();
    
    // Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return {
        success: false,
        error: "Transaction not found",
      };
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      return {
        success: false,
        error: "Transaction failed or reverted",
      };
    }

    // Check if transaction is to the correct contract
    if (receipt.to?.toLowerCase() !== USDT_CONTRACT_ADDRESS.toLowerCase()) {
      return {
        success: false,
        error: "Transaction is not a USDT transfer",
      };
    }

    // Parse Transfer events from logs
    const usdtContract = getUSDTContract(provider);
    const transferEvents = [];

    for (const log of receipt.logs) {
      try {
        // Check if this is a Transfer event
        if (log.topics[0] === TRANSFER_EVENT_SIGNATURE) {
          const parsedLog = usdtContract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });

          if (parsedLog && parsedLog.name === "Transfer") {
            const from = parsedLog.args.from;
            const to = parsedLog.args.to;
            const value = parsedLog.args.value;

            transferEvents.push({
              from: from.toLowerCase(),
              to: to.toLowerCase(),
              value: value.toString(),
            });
          }
        }
      } catch (err) {
        // Skip logs that can't be parsed
        continue;
      }
    }

    // Find transfer to merchant wallet
    const merchantTransfer = transferEvents.find(
      (event) => event.to === MERCHANT_WALLET_ADDRESS?.toLowerCase()
    );

    if (!merchantTransfer) {
      return {
        success: false,
        error: "No USDT transfer found to merchant wallet",
      };
    }

    // Verify sender if provided
    if (expectedFrom && merchantTransfer.from !== expectedFrom.toLowerCase()) {
      return {
        success: false,
        error: "Transaction sender does not match expected wallet",
      };
    }

    // Convert expected amount to BigNumber (with 18 decimals)
    const expectedAmountBN = ethers.parseUnits(expectedAmount.toString(), USDT_DECIMALS);
    const receivedAmountBN = BigInt(merchantTransfer.value);

    // Verify amount (allow small tolerance for rounding)
    if (receivedAmountBN < expectedAmountBN) {
      return {
        success: false,
        error: `Insufficient payment. Expected: ${expectedAmount} USDT, Received: ${ethers.formatUnits(receivedAmountBN, USDT_DECIMALS)} USDT`,
        receivedAmount: ethers.formatUnits(receivedAmountBN, USDT_DECIMALS),
        expectedAmount: expectedAmount,
      };
    }

    return {
      success: true,
      txHash: txHash,
      from: merchantTransfer.from,
      to: merchantTransfer.to,
      amount: ethers.formatUnits(receivedAmountBN, USDT_DECIMALS),
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      timestamp: null, // Can be fetched from block if needed
    };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify transaction",
    };
  }
};

/**
 * Get transaction details without verification
 * @param {string} txHash - Transaction hash
 * @returns {Promise<Object>} Transaction details
 */
const getTransactionDetails = async (txHash) => {
  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt) {
      return {
        success: false,
        error: "Transaction not found",
      };
    }

    return {
      success: true,
      txHash: txHash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      confirmations: receipt.confirmations,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch transaction",
    };
  }
};

/**
 * Check if wallet has sufficient USDT balance
 * @param {string} walletAddress - Wallet address to check
 * @param {string} requiredAmount - Required USDT amount
 * @returns {Promise<Object>} Balance check result
 */
const checkUSDTBalance = async (walletAddress, requiredAmount) => {
  try {
    const provider = getProvider();
    const usdtContract = getUSDTContract(provider);
    
    const balance = await usdtContract.balanceOf(walletAddress);
    const requiredAmountBN = ethers.parseUnits(requiredAmount.toString(), USDT_DECIMALS);

    return {
      success: true,
      hasSufficientBalance: balance >= requiredAmountBN,
      balance: ethers.formatUnits(balance, USDT_DECIMALS),
      required: requiredAmount,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to check balance",
    };
  }
};

module.exports = {
  verifyPayment,
  getTransactionDetails,
  checkUSDTBalance,
  USDT_CONTRACT_ADDRESS,
  MERCHANT_WALLET_ADDRESS,
  USDT_DECIMALS,
};
