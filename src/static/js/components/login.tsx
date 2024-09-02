import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MFAPopup } from "./mfapop";
import { useAuth } from "./AuthContext";

export const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showMFA, setShowMFA] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        try {
            const response = await fetch("/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                if (data.requireMFA) {
                    setShowMFA(true);
                } else {
                    login();
                    navigate("/");
                }
            } else {
                setError(data.detail || "Invalid username or password");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        }
    };

    const handleMFASubmit = async (mfaCode: string) => {
        try {
            const response = await fetch("/auth/mfa", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, mfa_code: mfaCode }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                login();
                setShowMFA(false);
                navigate("/");
            } else {
                setError("Invalid MFA code. Please try again.");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Login</h2>
                <form className="flex flex-col" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="bg-gray-100 text-gray-900 border-0 rounded-md p-2 mb-4 focus:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
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
