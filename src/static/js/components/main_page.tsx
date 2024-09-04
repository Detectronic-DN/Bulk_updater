import React, { useState, useEffect } from "react";
import StyledWrapper from "./styledwrapper";

const Spinner: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <StyledWrapper>
            <div className="loading">
                <span />
                <span />
                <span />
                <span />
                <span />
            </div>
        </StyledWrapper>
    );
};

const MainPage: React.FC = () => {
    const [operation, setOperation] = useState("addTags");
    const [file, setFile] = useState<File | null>(null);
    const [imeis, setImeis] = useState("");
    const [useDirectInput, setUseDirectInput] = useState(false);
    const [profileId, setProfileId] = useState("");
    const [tags, setTags] = useState("");
    const [thingKey, setThingKey] = useState("");
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const imeiOnlyOperations = [
        "addTags",
        "deleteTags",
        "deleteThingsKeys",
    ];

    const operationOptions = [
        "addSettings",
        "applyProfile",
        "addTags",
        "deleteTags",
        "changeDef",
        "deleteThingsKeys",
        "deleteThingsTags",
    ];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
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
            formData.append("operation", operation);
            formData.append("useDirectInput", useDirectInput.toString());
            if (profileId) formData.append("profileId", profileId);
            if (tags) formData.append("tags", tags);
            if (thingKey) formData.append("thingKey", thingKey);

            const response = await fetch("/api/device-management", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Server error");
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({
                error:
                    error instanceof Error ? error.message : "An unknown error occurred",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!imeiOnlyOperations.includes(operation)) {
            setUseDirectInput(false);
        }
    }, [operation]);

    return (
        <>
            <Spinner isLoading={isLoading} />
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-2xl font-bold mb-6">Device Management Tool</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="operation" className="block text-sm font-medium text-gray-700">
                                    Select Operation
                                </label>
                                <select
                                    id="operation"
                                    value={operation}
                                    onChange={(e) => setOperation(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    {operationOptions.map((op) => (
                                        <option key={op} value={op}>
                                            {op}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {imeiOnlyOperations.includes(operation) && (
                                <div className="flex items-center">
                                    <input
                                        id="use-direct-input"
                                        type="checkbox"
                                        checked={useDirectInput}
                                        onChange={(e) => setUseDirectInput(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="use-direct-input" className="ml-2 text-sm text-gray-700">
                                        Use direct IMEI input
                                    </label>
                                </div>
                            )}

                            {useDirectInput && imeiOnlyOperations.includes(operation) ? (
                                <div>
                                    <label htmlFor="imeis" className="block text-sm font-medium text-gray-700">
                                        Enter IMEI Numbers
                                    </label>
                                    <textarea
                                        id="imeis"
                                        value={imeis}
                                        onChange={(e) => setImeis(e.target.value)}
                                        rows={5}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter IMEI numbers, one per line"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                                        Upload File
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                        <div className="space-y-1 text-center">
                                            <div className="flex text-sm text-gray-600">
                                                <label
                                                    htmlFor="file-upload"
                                                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                                >
                                                    <span>Upload a file</span>
                                                    <input
                                                        id="file-upload"
                                                        name="file-upload"
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={handleFileChange}
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">CSV or TXT up to 10MB</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {operation === "applyProfile" && (
                                <div>
                                    <label htmlFor="profileId" className="block text-sm font-medium text-gray-700">
                                        Profile ID
                                    </label>
                                    <input
                                        id="profileId"
                                        type="text"
                                        value={profileId}
                                        onChange={(e) => setProfileId(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter Profile ID"
                                    />
                                </div>
                            )}

                            {["addTags", "deleteTags", "deleteThingsTags"].includes(operation) && (
                                <div>
                                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                                        Tags
                                    </label>
                                    <input
                                        id="tags"
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter tags separated by commas"
                                    />
                                </div>
                            )}

                            {operation === "changeDef" && (
                                <div>
                                    <label htmlFor="thingKey" className="block text-sm font-medium text-gray-700">
                                        Thing Definition Key
                                    </label>
                                    <input
                                        id="thingKey"
                                        type="text"
                                        value={thingKey}
                                        onChange={(e) => setThingKey(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Enter new thing definition key"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                disabled={isLoading}
                            >
                                {isLoading ? "Executing..." : "Execute Operation"}
                            </button>
                        </div>

                        {result && (
                            <div
                                className={`mt-8 p-4 rounded-md ${result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                                    }`}
                            >
                                <h3 className="text-lg font-medium">Operation Result</h3>
                                {result.error ? (
                                    <p className="mt-2 text-sm">{result.error}</p>
                                ) : (
                                    <pre className="mt-2 text-sm whitespace-pre-wrap overflow-x-auto">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MainPage;