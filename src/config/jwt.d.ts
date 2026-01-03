import { UserRole } from '../generated/prisma/enums';
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
}
export declare const generateToken: (payload: JWTPayload) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const getCookieOptions: () => {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    maxAge: number;
    path: string;
};
//# sourceMappingURL=jwt.d.ts.map