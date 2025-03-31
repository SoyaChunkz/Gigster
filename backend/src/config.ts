export const JWT_SECRET = process.env.JWT_SECRET ?? "sammo123";
export const WORKER_JWT_SECRET = JWT_SECRET + "worker";

//This variable represents a fraction of a full SOL, specifically 1,000,000 lamports (which is 0.001 SOL).
export const TOTAL_DECIMALS = 1000_000_000;

export const PARENT_WALLET_ADDRESS = "E5NpEGWMaqdbB91QbKq5CWHwtDfV1caxQeTAQAGPqeHy";