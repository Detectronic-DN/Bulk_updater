import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/static/js/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MFAPopup } from "@/static/js/components/mfapop";

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
            const result = await login(username, password);
            if (result.requireMFA) {
                setShowMFA(true);
            } else {
                navigate("/");
            }
        } catch (err) {
            setError((err as Error).message || "An error occurred. Please try again.");
        }
    };

    const handleMFASubmit = async (mfaCode: string) => {
        try {
            const result = await login(username, "", mfaCode);
            if (!result.requireMFA) {
                setShowMFA(false);
                navigate("/");
            } else {
                setError("MFA authentication failed. Please try again.");
            }
        } catch (err) {
            setError((err as Error).message || "An error occurred. Please try again.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button className="w-full mt-4" type="submit">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {showMFA && (
                <MFAPopup
                    onSubmit={handleMFASubmit}
                    onCancel={() => setShowMFA(false)}
                />
            )}
        </div>
    );
};