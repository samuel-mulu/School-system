export declare const getUsers: (role?: string) => Promise<any>;
export declare const getTeachers: () => Promise<any>;
export declare const createUser: (data: {
    email: string;
    password: string;
    name: string;
    role: "REGISTRAR" | "TEACHER";
}) => Promise<any>;
export declare const getUserById: (id: string) => Promise<any>;
export declare const updateUser: (id: string, data: {
    name?: string;
    email?: string;
    password?: string;
}) => Promise<any>;
export declare const deleteUser: (id: string) => Promise<void>;
//# sourceMappingURL=user.service.d.ts.map