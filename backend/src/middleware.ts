import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, WORKER_JWT_SECRET } from "./config";

export function userAuthMiddleware(req: Request, res: Response, next: NextFunction){

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token, 
            JWT_SECRET
        ) as { userId: number };

        if (decoded.userId) {
            // @ts-ignore
            req.userId = decoded.userId;
            return next();
        } else {
            return res.status(403).json({
                message: "You are not logged in"
            }); 
        }
    } catch (error) {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }
};

export function workerAuthMiddleware(req: Request, res: Response, next: NextFunction){

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token, 
            WORKER_JWT_SECRET
        ) as { userId : string };

        if (decoded.userId) {
            // @ts-ignore
            req.userId = decoded.userId;
            return next();
        } else {
            return res.status(403).json({
                message: "You are not logged in"
            }); 
        }
    } catch (error) {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }
};