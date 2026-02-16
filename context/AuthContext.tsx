
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '../types';

interface User {
  name: string;
  role: UserRole;
  avatar: string;
}

interface AuthContextType {
  user: User;
  switchRole: (role: UserRole) => void;
  canEdit: () => boolean;
  isAdmin: () => boolean;
  isStorekeeper: () => boolean;
  isTechnician: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    name: 'John Doe',
    role: UserRole.STOREKEEPER,
    avatar: 'JD'
  });

  const switchRole = (role: UserRole) => {
    setUser({ ...user, role });
  };

  const canEdit = () => user.role === UserRole.ADMIN || user.role === UserRole.STOREKEEPER;
  const isAdmin = () => user.role === UserRole.ADMIN;
  const isStorekeeper = () => user.role === UserRole.STOREKEEPER;
  const isTechnician = () => user.role === UserRole.TECHNICIAN;

  return (
    <AuthContext.Provider value={{ user, switchRole, canEdit, isAdmin, isStorekeeper, isTechnician }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
