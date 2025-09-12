import bcrypt from "bcryptjs";
import crypto from "crypto";

export const generateSalt = (): string => {
    return crypto.randomBytes(16).toString("hex");
};

export const hashPassword = async (password: string, salt: string): Promise<string> => {
    return bcrypt.hash(password + salt, 12);
};

export const verifyPassword = async (password: string, salt: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password + salt, hash);
};

export const generateSessionToken = (): string => {
    return crypto.randomBytes(32).toString("hex");
};

export const generateTwoFactorSecret = (): string => {
    return crypto.randomBytes(20).toString("hex");
};

export const isSessionExpired = (expiresAt: Date): boolean => {
    return new Date() > expiresAt;
};

export const createSessionExpiry = (hours: number = 24): Date => {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
};
