import React, { createContext, useState, useContext, useEffect } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string, mfaCode?: string) => Promise<{ requireMFA: boolean }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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
                }
                return { requireMFA: data.requireMFA };
            } else {
                throw new Error(data.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setIsAuthenticated(false);
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
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/auth/validate', {
                    credentials: 'include'
                });
                setIsAuthenticated(response.ok);
            } catch (error) {
                console.error('Failed to validate session:', error);
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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