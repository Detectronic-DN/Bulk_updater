import React, { useState, useEffect, useRef } from "react";
import {
    Settings,
    Upload,
    Tag,
    Trash,
    RefreshCw,
    Key,
    LayoutList,
    Activity,
} from "lucide-react";
import StyledWrapper from "./styledwrapper";

const operationIcons = {
    addSettings: <Settings size={20} />,
    applyProfile: <RefreshCw size={20} />,
    addTags: <Tag size={20} />,
    deleteTags: <Trash size={20} />,
    changeDef: <LayoutList size={20} />,
    undeploy: <RefreshCw size={20} />,
    deleteThingsKeys: <Key size={20} />,
    deleteThingsTags: <Tag size={20} />,
};

interface SpinnerProps {
    isLoading: boolean;
}

interface Log {
    target: string;
    level: string;
    message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ isLoading }) => {
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
    const [logs, setLogs] = useState<Log[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);
    const [error, setError] = useState<string | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const imeiOnlyOperations = [
        "addTags",
        "deleteTags",
        "undeploy",
        "deleteThingsKeys",
    ];

    useEffect(() => {
        eventSourceRef.current = new EventSource("/api/logs");
        eventSourceRef.current.onmessage = (event) => {
            try {
                const logData = JSON.parse(event.data);
                if (logData.message) {
                    setLogs((prevLogs) => [...prevLogs, logData]);
                }
            } catch (error) {
                setError("Error parsing log data");
            }
        };

        eventSourceRef.current.onerror = () => {
            setError("EventSource error occurred");
        };

        return () => {
            eventSourceRef.current?.close();
        };
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

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
                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="md:flex">
                        <div className="md:flex-shrink-0 bg-indigo-600 text-white p-8 md:w-64">
                            <h2 className="text-2xl font-bold mb-6">
                                Device Management Tool
                            </h2>
                            <ul>
                                {Object.entries(operationIcons).map(([op, icon]) => (
                                    <li key={op} className="mb-2">
                                        <button
                                            onClick={() => setOperation(op)}
                                            className={`flex items-center w-full p-2 rounded ${operation === op
                                                    ? "bg-indigo-700"
                                                    : "hover:bg-indigo-700"
                                                }`}
                                        >
                                            {icon}
                                            <span className="ml-2">{op}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-8 md:flex-grow">
                            <h3 className="text-xl font-semibold mb-6">{operation}</h3>
                            <div className="space-y-6">
                                {imeiOnlyOperations.includes(operation) && (
                                    <div className="flex items-center">
                                        <input
                                            id="use-direct-input"
                                            type="checkbox"
                                            checked={useDirectInput}
                                            onChange={(e) => setUseDirectInput(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label
                                            htmlFor="use-direct-input"
                                            className="ml-2 text-sm text-gray-700"
                                        >
                                            Use direct IMEI input
                                        </label>
                                    </div>
                                )}

                                {useDirectInput && imeiOnlyOperations.includes(operation) ? (
                                    <div>
                                        <label
                                            htmlFor="imeis"
                                            className="block text-sm font-medium text-gray-700"
                                        >
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
                                        <label
                                            htmlFor="file"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Upload File
                                        </label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
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
                                                <p className="text-xs text-gray-500">
                                                    CSV or TXT up to 10MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {operation === "applyProfile" && (
                                    <div>
                                        <label
                                            htmlFor="profileId"
                                            className="block text-sm font-medium text-gray-700"
                                        >
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

                                {["addTags", "deleteTags", "deleteThingsTags"].includes(
                                    operation
                                ) && (
                                        <div>
                                            <label
                                                htmlFor="tags"
                                                className="block text-sm font-medium text-gray-700"
                                            >
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
                                        <label
                                            htmlFor="thingKey"
                                            className="block text-sm font-medium text-gray-700"
                                        >
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
                                    className={`mt-8 p-4 rounded-md ${result.error
                                            ? "bg-red-50 text-red-700"
                                            : "bg-green-50 text-green-700"
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

                            {/* Logs section */}
                            <div className="mt-8">
                                <h3 className="text-lg font-medium mb-2 flex items-center">
                                    <Activity className="mr-2" size={20} />
                                    Real-time Logs
                                </h3>
                                <div
                                    ref={logContainerRef}
                                    className="bg-gray-50 rounded-md p-2 h-32 overflow-y-auto text-xs"
                                >
                                    {logs.length === 0 ? (
                                        <p className="text-gray-500 text-center">
                                            No logs yet. Execute an operation to see logs.
                                        </p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {logs.map((log, index) => (
                                                <li key={index} className="flex items-start">
                                                    <span
                                                        className={`px-1 py-0.5 rounded-full text-xs mr-1 flex-shrink-0 ${log.level === "info"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : log.level === "error"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-yellow-100 text-yellow-800"
                                                            }`}
                                                    >
                                                        {log.level.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="font-medium mr-1">
                                                        {log.target}:
                                                    </span>
                                                    <span className="break-all">{log.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MainPage;
