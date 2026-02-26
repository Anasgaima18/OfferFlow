import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, User } from './AuthContext';
import { auth } from '../services/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Validate token against server
          const res = await auth.me();
          // @ts-expect-error - Some backend responses might wrap in data.data
          const serverUser = res.data?.data?.user ?? res.data?.user;
          if (serverUser && serverUser.id) {
            setUser(serverUser);
            localStorage.setItem('user', JSON.stringify(serverUser));
          } else {
            // Token valid but unexpected response shape — use cached user
            setUser(JSON.parse(savedUser));
          }
        } catch {
          // Token is invalid or user deleted — clear auth state
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    if (!token || !userData) {
        console.error("Attempted to login with missing data");
        return;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
