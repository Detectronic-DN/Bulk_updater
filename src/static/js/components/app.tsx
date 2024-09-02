import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './login';
import MainPage from './main_page';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            try {
                const response = await fetch('/auth/validate', {
                    credentials: 'include'
                });
                setIsValidating(false);
            } catch (error) {
                console.error('Failed to validate session:', error);
                setIsValidating(false);
            }
        };
        validateSession();
    }, []);

    if (isValidating) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const Navigation: React.FC = () => {
    const { isAuthenticated, logout } = useAuth();

    return (
        <nav className="bg-gray-800 p-4">
            <ul className="flex space-x-4">
                <li>
                    <Link to="/" className="text-white hover:text-gray-300">Home</Link>
                </li>
                {isAuthenticated ? (
                    <li>
                        <button onClick={logout} className="text-white hover:text-gray-300">Logout</button>
                    </li>
                ) : (
                    <li>
                        <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
                    </li>
                )}
            </ul>
        </nav>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <div className="app">
                    <Navigation />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                            <ProtectedRoute>
                                <MainPage />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;