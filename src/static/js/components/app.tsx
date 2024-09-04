import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './login';
import MainPage from './main_page';
import { CircleUser } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, validateSession } = useAuth();
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            setIsValidating(true);
            await validateSession();
            setIsValidating(false);
        };
        checkSession();
    }, [validateSession]);

    if (isValidating) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const UserInfo: React.FC = () => {
    const { username, logout } = useAuth();

    return (
        <div className="flex items-center">
            <CircleUser className="text-white mr-2" size={24} />
            <span className="text-white mr-4">{username}</span>
            <button onClick={logout} className="text-white hover:text-gray-300">
                Logout
            </button>
        </div>
    );
};

const Navigation: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <nav className="bg-gray-800 p-4">
            <div className="container mx-auto flex justify-between items-center">
                <ul className="flex space-x-4">
                </ul>
                {isAuthenticated ? (
                    <UserInfo />
                ) : (
                    <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
                )}
            </div>
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