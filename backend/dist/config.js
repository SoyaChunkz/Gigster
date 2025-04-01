"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARENT_WALLET_KEY = exports.PARENT_WALLET_ADDRESS = exports.TOTAL_DECIMALS = exports.ALLOWED_TIME_DIFF = exports.DEFAULT_TITLE = exports.WORKER_JWT_SECRET = exports.JWT_SECRET = void 0;
exports.JWT_SECRET = (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : "sammo123";
exports.WORKER_JWT_SECRET = exports.JWT_SECRET + "worker";
exports.DEFAULT_TITLE = "Select the most clickable thumbnail";
exports.ALLOWED_TIME_DIFF = 5 * 60 * 1000;
//This variable represents a fraction of a full SOL, specifically 1,000,000 lamports (which is 0.001 SOL).
exports.TOTAL_DECIMALS = 1000000000;
exports.PARENT_WALLET_ADDRESS = "E5NpEGWMaqdbB91QbKq5CWHwtDfV1caxQeTAQAGPqeHy";
exports.PARENT_WALLET_KEY = "YLynG9J64ic798RFZqT4pTqRtaPJwrBiBj69peoWVe82rYbAK91fWGeAawQJjS3Pe9dQDA22CYiZCai7o9VemSj";
