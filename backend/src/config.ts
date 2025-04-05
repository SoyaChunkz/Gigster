function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable "${name}" is required but not defined.`);
    }
    return value;
}

export const JWT_SECRET = requiredEnv("JWT_SECRET");
export const WORKER_JWT_SECRET = requiredEnv("WORKER_JWT_SECRET");
export const PARENT_WALLET_ADDRESS = requiredEnv("PARENT_WALLET_ADDRESS");
export const PARENT_WALLET_KEY = requiredEnv("PARENT_WALLET_KEY");

export const DEFAULT_TITLE = "Select the most clickable thumbnail";
export const ALLOWED_TIME_DIFF = 5 * 60 * 1000;
//This variable represents a fraction of a full SOL, specifically 1,000,000 lamports (which is 0.001 SOL).
export const TOTAL_DECIMALS = 1000_000_000;