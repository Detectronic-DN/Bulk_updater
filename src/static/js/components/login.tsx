import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MFAPopup } from './mfapop';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showMFA, setShowMFA] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        try {
            // Here you would send a request to your backend
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.requireMFA) {
                setShowMFA(true);
            } else if (data.success) {
                navigate('/'); // Redirect to main page after successful login
            } else {
                setError(data.error || 'Invalid email or password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    const handleMFASubmit = async (mfaCode: string) => {
        try {
            // Here you would send the MFA code to your backend
            const response = await fetch('/api/verify-mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mfaCode }),
            });

            const data = await response.json();

            if (data.success) {
                setShowMFA(false);
                navigate('/'); // Redirect to main page after successful MFA verification
            } else {
                setError('Invalid MFA code. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };


    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Login</h2>
                <form className="flex flex-col" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        className="bg-gray-100 text-gray-900 border-0 rounded-md p-2 mb-4 focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        className="bg-gray-100 text-gray-900 border-0 rounded-md p-2 mb-4 focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <div className="flex items-center justify-between flex-wrap mb-4">
                        <label
                            htmlFor="remember-me"
                            className="text-sm text-gray-900 cursor-pointer"
                        >
                            <input type="checkbox" id="remember-me" className="mr-2" />
                            Remember me
                        </label>
                        
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm mb-4">{error}</p>
                    )}
                    <button
                        type="submit"
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-600 hover:to-blue-600 transition ease-in-out duration-150"
                    >
                        Login
                    </button>
                </form>

            </div>
            {showMFA && (
                <MFAPopup
                    onSubmit={handleMFASubmit}
                    onCancel={() => setShowMFA(false)}
                />
            )}
        </div>
    );
};