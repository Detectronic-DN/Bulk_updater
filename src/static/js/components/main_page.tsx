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
    const [operation, setOperation] = useState("Add Alarm Settings");
    const [file, setFile] = useState<File | null>(null);
    const [imeis, setImeis] = useState("");
    const [useDirectInput, setUseDirectInput] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [tags, setTags] = useState("");
    const [thingDefinition, setThingDefinition] = useState("");
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const imeiOnlyOperations = [
        "Add Tags",
        "Delete Tags",
        "Delete Thing by Imei",
        "Onboarding",
    ];

    const operationOptions = [
        "Onboarding",
        "Apply Device Profile",
        "Add Alarm Settings",
        "Change ThingDefinition",
        "Add Tags",
        "Delete Tags",
        "Delete Thing by Imei",
        "Delete Thing by Tags"
    ];

    const operationMapping = {
        "Onboarding": "onboarding",
        "Apply Device Profile": "apply-profile",
        "Add Alarm Settings": "add-settings",
        "Change ThingDefinition": "change-def",
        "Add Tags": "add-tags",
        "Delete Tags": "delete-tags",
        "Delete Thing by Imei": "delete-things-keys",
        "Delete Thing by Tags": "delete-things-tags"
    };

    const profileOptions = [
        "Device Management Profile - Basic (Global)",
        "Device Management Profile - Troubleshooting (Global)",
        "Minimal FOTA Profile (Global)",
        "LIDOTT Device Profile"
    ];

    const thingDefOptions = [
        "Default",
        "LIDOTT"
    ];

    const profileMapping = {
        "Device Management Profile - Basic (Global)": "5e834741447cfb6072a732a5",
        "Device Management Profile - Troubleshooting (Global)": "5e834741447cfb6072a732dc",
        "Minimal FOTA Profile (Global)": "5e834741447cfb6072a73326",
        "LIDOTT Device Profile": "65a7d9d5447cfb0578dead76"
    };

    const thingDefMapping = {
        "Default": "6086e89eba2b57514c9bdbc9",
        "LIDOTT": "65a69096ba2b577d739e6a31"
    };

    useEffect(() => {
        if (!imeiOnlyOperations.includes(operation)) {
            setUseDirectInput(false);
        }
    }, [operation]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const selectedFile = event.target.files[0];
            setFile(selectedFile);
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
            if (profileName) {
                const profileId = profileMapping[profileName as keyof typeof profileMapping];
                formData.append("profileId", profileId);
            }
            if (tags) {
                const tagList = tags.includes(',')
                    ? tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
                    : [tags.trim()].filter(tag => tag !== '');
                formData.append("tags", JSON.stringify(tagList));
            }

            if (thingDefinition) {
                const thingDefId = thingDefMapping[thingDefinition as keyof typeof thingDefMapping];
                formData.append("thingDefinitionId", thingDefId);
            }

            const apiOperation = operationMapping[operation as keyof typeof operationMapping];
            const response = await fetch(`/api/${apiOperation}`, {
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
                                            <p className="text-xs text-gray-500">CSV or XLSX file up to 10MB</p>
                                        </div>
                                    </div>
                                    {file && <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>}
                                </div>
                            )}

                            {(operation === "Apply Device Profile" || operation === "Onboarding") && (
                                <div>
                                    <label htmlFor="profileName" className="block text-sm font-medium text-gray-700">
                                        {operation === "Onboarding" ? "Device Profile" : "Profile Name"}
                                    </label>
                                    <select
                                        id="profileName"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">Select a profile</option>
                                        {profileOptions.map((profile) => (
                                            <option key={profile} value={profile}>
                                                {profile}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(["Add Tags", "Delete Tags", "Delete Thing by Tags", "Onboarding"].includes(operation)) && (
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

                            {(operation === "Change ThingDefinition" || operation === "Onboarding") && (
                                <div>
                                    <label htmlFor="thingDefinition" className="block text-sm font-medium text-gray-700">
                                        Thing Definition
                                    </label>
                                    <select
                                        id="thingDefinition"
                                        value={thingDefinition}
                                        onChange={(e) => setThingDefinition(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">Select a thing definition</option>
                                        {thingDefOptions.map((def) => (
                                            <option key={def} value={def}>
                                                {def}
                                            </option>
                                        ))}
                                    </select>
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
                                className={`mt-8 p-4 rounded-md ${result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
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