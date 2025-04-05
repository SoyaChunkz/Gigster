"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTAL_DECIMALS = exports.ALLOWED_TIME_DIFF = exports.DEFAULT_TITLE = exports.PARENT_WALLET_KEY = exports.PARENT_WALLET_ADDRESS = exports.WORKER_JWT_SECRET = exports.JWT_SECRET = void 0;
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable "${name}" is required but not defined.`);
    }
    return value;
}
exports.JWT_SECRET = requiredEnv("JWT_SECRET");
exports.WORKER_JWT_SECRET = requiredEnv("WORKER_JWT_SECRET");
exports.PARENT_WALLET_ADDRESS = requiredEnv("PARENT_WALLET_ADDRESS");
exports.PARENT_WALLET_KEY = requiredEnv("PARENT_WALLET_KEY");
exports.DEFAULT_TITLE = "Select the most clickable thumbnail";
exports.ALLOWED_TIME_DIFF = 5 * 60 * 1000;
//This variable represents a fraction of a full SOL, specifically 1,000,000 lamports (which is 0.001 SOL).
exports.TOTAL_DECIMALS = 1000000000;
