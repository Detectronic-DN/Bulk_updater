import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    login: (username: string, password: string, mfaCode?: string) => Promise<{ requireMFA: boolean }>;
    logout: () => Promise<void>;
    validateSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [username, setUsername] = useState<string | null>(null);

    const validateSession = useCallback(async () => {
        try {
            const response = await fetch('/auth/validate', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setIsAuthenticated(true);
                setUsername(data.username);
            } else {
                setIsAuthenticated(false);
                setUsername(null);
            }
        } catch (error) {
            console.error('Failed to validate session:', error);
            setIsAuthenticated(false);
            setUsername(null);
        }
    }, []);

    useEffect(() => {
        validateSession();
    }, [validateSession]);

    const login = async (username: string, password: string, mfaCode?: string): Promise<{ requireMFA: boolean }> => {
        try {
            const endpoint = mfaCode ? '/auth/mfa' : '/auth/token';
            const body = mfaCode
                ? JSON.stringify({ username, mfa_code: mfaCode })
                : new URLSearchParams({ username, password });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': mfaCode ? 'application/json' : 'application/x-www-form-urlencoded',
                },
                body: body,
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                if (!data.requireMFA) {
                    setIsAuthenticated(true);
                    setUsername(data.username);
                }
                return { requireMFA: data.requireMFA };
            } else {
                throw new Error(data.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setIsAuthenticated(false);
            setUsername(null);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fetch('/auth/logout', {
                method: 'GET',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error during logout:', error);
        }
        setIsAuthenticated(false);
        setUsername(null);
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/auth/validate', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setIsAuthenticated(true);
                    setUsername(data.username);
                } else {
                    setIsAuthenticated(false);
                    setUsername(null);
                }
            } catch (error) {
                console.error('Failed to validate session:', error);
                setIsAuthenticated(false);
                setUsername(null);
            }
        };
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, login, logout, validateSession }}>
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