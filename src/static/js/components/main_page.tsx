import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "../components/spinner";

const operationOptions = [
    "add-settings",
    "apply-profile",
    "add-tags",
    "delete-tags",
    "change-def",
    "delete-things-keys",
    "delete-things-tags",
    "Onboarding",
];

const imeiOnlyOperations = [
    "add-tags",
    "delete-tags",
    "delete-things-keys",
];

const MainPage: React.FC = () => {
    const [operation, setOperation] = useState("add-settings");
    const [file, setFile] = useState<File | null>(null);
    const [imeis, setImeis] = useState("");
    const [useDirectInput, setUseDirectInput] = useState(false);
    const [profileId, setProfileId] = useState("");
    const [tags, setTags] = useState("");
    const [thingKey, setThingKey] = useState("");
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!imeiOnlyOperations.includes(operation)) {
            setUseDirectInput(false);
        }
    }, [operation]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        } else {
            setFile(null);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            if (useDirectInput && imeiOnlyOperations.includes(operation)) {
                formData.append("imeis", imeis);
            } else if (file) {
                formData.append("file", file);
            }
            if (profileId) formData.append("profileId", profileId);
            if (tags) formData.append("tags", tags);
            if (thingKey) formData.append("thingKey", thingKey);

            const response = await fetch(`/api/${operation}`, {
                method: "POST",
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setResult(data.result || data);
        } catch (error) {
            setResult({
                error: error instanceof Error ? error.message : "An unknown error occurred",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Device Management Tool</CardTitle>
                    <CardDescription>Manage your devices with ease</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="operation">Select Operation</Label>
                            <Select onValueChange={(value) => setOperation(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an operation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {operationOptions.map((op) => (
                                        <SelectItem key={op} value={op}>
                                            {op}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {imeiOnlyOperations.includes(operation) && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="use-direct-input"
                                    checked={useDirectInput}
                                    onCheckedChange={(checked) => setUseDirectInput(checked as boolean)}
                                />
                                <Label htmlFor="use-direct-input">Use direct IMEI input</Label>
                            </div>
                        )}

                        {useDirectInput && imeiOnlyOperations.includes(operation) ? (
                            <div>
                                <Label htmlFor="imeis">Enter IMEI Numbers</Label>
                                <Textarea
                                    id="imeis"
                                    value={imeis}
                                    onChange={(e) => setImeis(e.target.value)}
                                    placeholder="Enter IMEI numbers, one per line"
                                    rows={5}
                                />
                            </div>
                        ) : (
                            <div>
                                <Label htmlFor="file-upload">Upload File</Label>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".csv,.txt"
                                />
                                {file && <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>}
                            </div>
                        )}

                        {operation === "apply-profile" && (
                            <div>
                                <Label htmlFor="profileId">Profile ID</Label>
                                <Input
                                    id="profileId"
                                    value={profileId}
                                    onChange={(e) => setProfileId(e.target.value)}
                                    placeholder="Enter Profile ID"
                                />
                            </div>
                        )}

                        {["add-tags", "delete-tags", "delete-things-tags"].includes(operation) && (
                            <div>
                                <Label htmlFor="tags">Tags</Label>
                                <Input
                                    id="tags"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Enter tags separated by commas"
                                />
                            </div>
                        )}

                        {operation === "change-def" && (
                            <div>
                                <Label htmlFor="thingKey">Thing Definition Key</Label>
                                <Input
                                    id="thingKey"
                                    value={thingKey}
                                    onChange={(e) => setThingKey(e.target.value)}
                                    placeholder="Enter new thing definition key"
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Spinner className="mr-2" /> : null}
                        {isLoading ? "Executing..." : "Execute Operation"}
                    </Button>
                </CardFooter>
            </Card>

            {result && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Operation Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default MainPage;