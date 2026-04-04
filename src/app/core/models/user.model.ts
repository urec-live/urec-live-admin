export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  createdAt?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

export interface UpdateUserRolesRequest {
  roles: string[];
}