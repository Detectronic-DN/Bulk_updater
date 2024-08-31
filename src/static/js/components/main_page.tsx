import React, { useState, useEffect } from 'react';

export const MainPage: React.FC = () => {
    const [operation, setOperation] = useState('addTags');
    const [file, setFile] = useState<File | null>(null);
    const [imeis, setImeis] = useState('');
    const [useDirectInput, setUseDirectInput] = useState(false);
    const [profileId, setProfileId] = useState('');
    const [tags, setTags] = useState('');
    const [thingKey, setThingKey] = useState('');
    const [result, setResult] = useState<any>(null);

    const imeiOnlyOperations = ['addTags', 'deleteTags', 'undeploy', 'deleteThingsKeys'];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            if (useDirectInput && imeiOnlyOperations.includes(operation)) {
                formData.append('imeis', imeis);
            } else if (file) {
                formData.append('file', file);
            }
            formData.append('operation', operation);
            formData.append('useDirectInput', useDirectInput.toString());
            if (profileId) formData.append('profileId', profileId);
            if (tags) formData.append('tags', tags);
            if (thingKey) formData.append('thingKey', thingKey);

            const response = await fetch('/api/device-management', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
        }
    };

    useEffect(() => {
        if (!imeiOnlyOperations.includes(operation)) {
            setUseDirectInput(false);
        }
    }, [operation]);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Device Management Tool</h2>
                <div className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="operation" className="block text-sm font-medium text-gray-700">Select Operation</label>
                        <select
                            id="operation"
                            value={operation}
                            onChange={(e) => setOperation(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="addSettings">Add Settings</option>
                            <option value="applyProfile">Apply Profile</option>
                            <option value="addTags">Add Tags</option>
                            <option value="deleteTags">Delete Tags</option>
                            <option value="changeDef">Change Definition</option>
                            <option value="undeploy">Undeploy Devices</option>
                            <option value="deleteThingsKeys">Delete Things by Keys</option>
                            <option value="deleteThingsTags">Delete Things by Tags</option>
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
                            <label htmlFor="use-direct-input" className="ml-2 block text-sm text-gray-900">
                                Use direct IMEI input
                            </label>
                        </div>
                    )}

                    {(useDirectInput && imeiOnlyOperations.includes(operation)) ? (
                        <div>
                            <label htmlFor="imeis" className="block text-sm font-medium text-gray-700">Enter IMEI Numbers</label>
                            <textarea
                                id="imeis"
                                value={imeis}
                                onChange={(e) => setImeis(e.target.value)}
                                rows={5}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter IMEI numbers, one per line"
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="file" className="block text-sm font-medium text-gray-700">Upload File</label>
                            <input
                                id="file"
                                type="file"
                                onChange={handleFileChange}
                                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    )}

                    {operation === 'applyProfile' && (
                        <div>
                            <label htmlFor="profileId" className="block text-sm font-medium text-gray-700">Profile ID</label>
                            <input
                                id="profileId"
                                type="text"
                                value={profileId}
                                onChange={(e) => setProfileId(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter Profile ID"
                            />
                        </div>
                    )}

                    {['addTags', 'deleteTags', 'deleteThingsTags'].includes(operation) && (
                        <div>
                            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags</label>
                            <input
                                id="tags"
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter tags separated by commas"
                            />
                        </div>
                    )}

                    {operation === 'changeDef' && (
                        <div>
                            <label htmlFor="thingKey" className="block text-sm font-medium text-gray-700">Thing Definition Key</label>
                            <input
                                id="thingKey"
                                type="text"
                                value={thingKey}
                                onChange={(e) => setThingKey(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter new thing definition key"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Execute Operation
                    </button>
                </div>

                {result && (
                    <div className={`mt-8 p-4 rounded-md ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        <h3 className="text-lg font-medium">Operation Result</h3>
                        {result.error ? (
                            <p className="mt-2 text-sm">{result.error}</p>
                        ) : (
                            <pre className="mt-2 text-sm whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};