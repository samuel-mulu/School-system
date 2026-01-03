import { UserRole } from '../generated/prisma/enums';
interface RegisterData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}
interface LoginData {
    email: string;
    password: string;
}
export declare const register: (data: RegisterData) => Promise<any>;
export declare const login: (data: LoginData) => Promise<{
    user: {
        id: any;
        email: any;
        name: any;
        role: any;
    };
    token: any;
}>;
export declare const getCurrentUser: (userId: string) => Promise<any>;
export {};
//# sourceMappingURL=auth.service.d.ts.map