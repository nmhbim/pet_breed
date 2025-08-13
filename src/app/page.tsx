"use client";

import { useState, useRef } from "react";
import Image from "next/image";

// Extend HTMLInputElement to include webkitdirectory
declare global {
    interface HTMLInputElement {
        webkitdirectory: boolean;
    }
}

interface ProcessResult {
    breedName: string;
    colors: string[];
    masterImage?: {
        color: string;
        imageData: string;
        fileName: string;
        isApproved: boolean;
    };
    processedImages: {
        fileName: string;
        imageData?: string;
        version?: number;
        isError?: boolean;
        errorMessage?: string;
    }[];
    status: "pending" | "processing" | "completed" | "error" | "needs_master";
    error?: string;
    isExpanded?: boolean;
}

export default function Home() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ProcessResult[]>([]);
    const [apiKey, setApiKey] = useState("");
    const [generatingImages, setGeneratingImages] = useState<{
        [key: string]: boolean;
    }>({});
    const [generatingMaster, setGeneratingMaster] = useState<{
        [key: string]: boolean;
    }>({});
    const [selectedColors, setSelectedColors] = useState<{
        [breedName: string]: string[];
    }>({});
    const [customColorsPrompt, setCustomColorsPrompt] = useState<string>(
        "What are the realistic natural coat colors and patterns for {animalType} {breedName}? Provide actual fur colors that exist in nature, not fantasy colors. Return only color names separated by commas. Example: 'Black and White, Brown, Sable, Gray'"
    );
    const [customMasterPrompt, setCustomMasterPrompt] = useState<string>(
        "Create an accurate {animalType} {breedName} with {color} fur in the same artistic style and pose as the reference image. The animal must have correct {breedName} breed characteristics while matching the cartoon style, composition and pose from the reference. Transparent background, no background elements."
    );
    const [customVariantsPrompt, setCustomVariantsPrompt] = useState<string>(
        "Change only the fur color of this {animalType} {breedName} to {color}. Keep everything else EXACTLY the same: same pose, same facial expression, same body position, same artistic style, same proportions. Only the fur color should change. Maintain transparent background."
    );
    const [breedList, setBreedList] = useState<string[]>([]);
    const [isAddingBreeds, setIsAddingBreeds] = useState(false);
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [animalType, setAnimalType] = useState<string>("Dog");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const referenceImageInputRef = useRef<HTMLInputElement>(null);

    const handleFolderUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const newResults: ProcessResult[] = [];

        try {
            // Read the text file
            const text = await file.text();
            const lines = text
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            // Parse breed:colors format
            const breedColorMap: { [breedName: string]: string[] } = {};
            const breeds: string[] = [];

            for (const line of lines) {
                if (line.includes(":")) {
                    // Format: "Breed: color1, color2, color3"
                    const [breedName, colorsStr] = line
                        .split(":")
                        .map((s) => s.trim());
                    if (breedName && colorsStr) {
                        const colors = colorsStr
                            .split(",")
                            .map((c) => c.trim())
                            .filter((c) => c.length > 0);
                        breedColorMap[breedName] = colors;
                        breeds.push(breedName);
                    }
                } else {
                    // Format: just breed name (fallback to ChatGPT)
                    breeds.push(line);
                }
            }

            // Store breed list for later use
            setBreedList(breeds);

            // Process each breed
            for (const breedName of breeds) {
                // Add result for this breed
                newResults.push({
                    breedName,
                    colors: [],
                    processedImages: [],
                    status: "processing",
                    isExpanded: false,
                });

                try {
                    let colors: string[] = [];

                    if (breedColorMap[breedName]) {
                        // Use colors from file
                        colors = breedColorMap[breedName];
                    } else {
                        // Get colors from ChatGPT
                        const colorsResponse = await fetch("/api/chatgpt", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                breedName,
                                animalType,
                                apiKey,
                                customColorsPrompt,
                            }),
                        });

                        if (!colorsResponse.ok) {
                            throw new Error(
                                "Failed to get colors from ChatGPT"
                            );
                        }

                        const response = await colorsResponse.json();
                        colors = response.colors;
                    }

                                         // Update result with colors
                     const resultIndex = newResults.length - 1;
                     newResults[resultIndex].colors = colors;
                     newResults[resultIndex].status = "needs_master";
                } catch (error) {
                    const resultIndex = newResults.length - 1;
                    newResults[resultIndex].status = "error";
                    newResults[resultIndex].error =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                }
            }

            setResults(newResults);
        } catch (error) {
            console.error("Error reading file:", error);
            alert(
                "Error reading the text file. Please make sure it contains valid text."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddMoreBreeds = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            alert("Please select a text file first");
            return;
        }

        setIsAddingBreeds(true);
        const newResults = [...results];

        try {
            // Read the text file
            const text = await file.text();
            const lines = text
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            // Parse breed:colors format
            const breedColorMap: { [breedName: string]: string[] } = {};
            const newBreeds: string[] = [];

            for (const line of lines) {
                if (line.includes(":")) {
                    // Format: "Breed: color1, color2, color3"
                    const [breedName, colorsStr] = line
                        .split(":")
                        .map((s) => s.trim());
                    if (breedName && colorsStr) {
                        const colors = colorsStr
                            .split(",")
                            .map((c) => c.trim())
                            .filter((c) => c.length > 0);
                        breedColorMap[breedName] = colors;
                        if (!breedList.includes(breedName)) {
                            newBreeds.push(breedName);
                        }
                    }
                } else {
                    // Format: just breed name (fallback to ChatGPT)
                    if (!breedList.includes(line)) {
                        newBreeds.push(line);
                    }
                }
            }

            let updatedCount = 0;

            // Update existing breeds with new colors
            for (const [breedName, colors] of Object.entries(breedColorMap)) {
                const existingIndex = newResults.findIndex(
                    (r) => r.breedName === breedName
                );
                if (existingIndex >= 0) {
                    // Merge colors with existing ones
                    const existingColors = newResults[existingIndex].colors;
                    const mergedColors = [
                        ...new Set([...existingColors, ...colors]),
                    ];
                    newResults[existingIndex].colors = mergedColors;
                    updatedCount++;
                }
            }

            // Add new breeds
            for (const breedName of newBreeds) {
                newResults.push({
                    breedName,
                    colors: breedColorMap[breedName] || [],
                    processedImages: [],
                    status: "completed",
                    isExpanded: false,
                });
                updatedCount++;
            }

            // Update breed list
            const updatedBreedList = [...new Set([...breedList, ...newBreeds])];
            setBreedList(updatedBreedList);

            setResults(newResults);
            alert(
                `Successfully updated ${updatedCount} breeds with new colors!`
            );
        } catch (error) {
            console.error("Error reading file:", error);
            alert(
                "Error reading the text file. Please make sure it contains valid text."
            );
        } finally {
            setIsAddingBreeds(false);
        }
    };

    const handleSaveColorsToFile = () => {
        // Create content with breed:colors format
        const content = results
            .filter((result) => result.colors.length > 0)
            .map((result) => `${result.breedName}: ${result.colors.join(", ")}`)
            .join("\n");

        if (content.length === 0) {
            alert("No colors found to save. Please process some breeds first.");
            return;
        }

        // Create and download file
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "dog_breeds_with_colors.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(
            "Colors saved to file! You can use this file for future uploads to avoid calling ChatGPT."
        );
    };

    const handleReferenceImageUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setReferenceImage(file);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "text-green-600";
            case "processing":
                return "text-blue-600";
            case "error":
                return "text-red-600";
            case "needs_master":
                return "text-yellow-600";
            default:
                return "text-gray-600";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return "✅";
            case "processing":
                return "⏳";
            case "error":
                return "❌";
            case "needs_master":
                return "🎯";
            default:
                return "⏸️";
        }
    };

    const generateMasterImage = async (breedName: string, resultIndex: number) => {
        if (!referenceImage) {
            alert("Please upload a reference image first!");
            return;
        }

        const result = results[resultIndex];
        if (!result.colors.length) {
            alert("No colors found for this breed!");
            return;
        }

        try {
            setGeneratingMaster(prev => ({ ...prev, [breedName]: true }));

            // Use first color as master color
            const masterColor = result.colors[0];

            // Convert reference image to base64
            const referenceBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(referenceImage);
            });

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    referenceImageData: referenceBase64,
                    breedName: breedName,
                    animalType: animalType,
                    color: masterColor,
                    apiKey: apiKey,
                    customPrompt: customMasterPrompt,
                    isMasterGeneration: true, // Flag để API biết đây là master generation
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate master image`);
            }

            const generatedImage = await response.json();

            // Update result with master image
            const updatedResults = [...results];
            updatedResults[resultIndex].masterImage = {
                color: masterColor,
                imageData: generatedImage.imageData,
                fileName: generatedImage.fileName,
                isApproved: false
            };
            updatedResults[resultIndex].status = "completed";
            setResults(updatedResults);

        } catch (error) {
            console.error("Error generating master image:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate master image'}`);
        } finally {
            setGeneratingMaster(prev => ({ ...prev, [breedName]: false }));
        }
    };

  return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        🐾 Animal Color Variant Generator
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Upload a list of animal breeds and generate color
                        variants using AI
                    </p>
                </div>

                {/* API Key Input */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        🔑 OpenAI API Key
                    </h2>
                    <label
                        htmlFor="api-key"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        API Key
                    </label>
                    <input
                        id="api-key"
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your OpenAI API key"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                        Your API key is stored locally and never sent to our
                        servers
                    </p>
                </div>

                {/* Animal Type Input */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        🐾 Animal Type
                    </h2>
                    <label
                        htmlFor="animal-type"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Animal Type
                    </label>
                    <input
                        id="animal-type"
                        type="text"
                        value={animalType}
                        onChange={(e) => setAnimalType(e.target.value)}
                        placeholder="Enter animal type (e.g., Dog, Cat, Hamster...)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                        Specify the type of animal for color generation (e.g.,
                        Dog, Cat, Rabbit, Hamster)
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        📁 Upload Animal Breed List
                    </h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <label
                            htmlFor="folder-upload"
                            className="cursor-pointer"
                        >
                            <input
                                id="folder-upload"
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFolderUpload}
                                className="hidden"
                                disabled={isProcessing}
                                accept=".txt"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing || !apiKey}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                {isProcessing
                                    ? "Processing..."
                                    : "Select Text File"}
                            </button>
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                            Select a text file with animal breed names (one per
                            line)
                        </p>
                    </div>
                </div>

                {/* Reference Image Upload */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        🖼️ Reference Image
                    </h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <label
                            htmlFor="reference-image"
                            className="cursor-pointer"
                        >
                            <input
                                id="reference-image"
                                ref={referenceImageInputRef}
                                type="file"
                                onChange={handleReferenceImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                            <button
                                onClick={() =>
                                    referenceImageInputRef.current?.click()
                                }
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Select Reference Image
                            </button>
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                            Upload a reference image for style, pose, and design
                            (will be used for all breeds)
                        </p>

                        {referenceImage && (
                            <div className="mt-4 p-4 bg-gray-50 rounded">
                                <p className="text-sm text-gray-600 mb-2">
                                    Reference image: {referenceImage.name}
                                </p>
                                <img
                                    src={URL.createObjectURL(referenceImage)}
                                    alt="Reference"
                                    className="w-32 h-32 object-cover rounded mx-auto"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Add More Colors Button */}
                {breedList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <button
                            onClick={handleAddMoreBreeds}
                            disabled={isAddingBreeds}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            {isAddingBreeds
                                ? "⏳ Adding Colors..."
                                : "🎨 Add More Colors"}
                        </button>
                        <p className="text-xs text-gray-500">
                            Add more colors to existing breeds or new breeds
                            with colors (format: "Breed: color1, color2")
                        </p>

                        {/* Save Colors to File Button */}
                        <button
                            onClick={handleSaveColorsToFile}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            💾 Save Colors to File
                        </button>
                        <p className="text-xs text-gray-500">
                            Download updated file with colors from ChatGPT for
                            future use
                        </p>
                    </div>
                )}

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            🎨 Processing Results
                        </h2>

                        {/* Summary */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-blue-900">
                                        Summary
                                    </h3>
                                    <p className="text-blue-700 text-sm">
                                        {
                                            results.filter(
                                                (r) => r.status === "completed"
                                            ).length
                                        }{" "}
                                        breeds processed successfully
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-blue-700 text-sm">
                                        Total colors found:{" "}
                                        {results.reduce(
                                            (sum, r) => sum + r.colors.length,
                                            0
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Generate All Button */}
                            {results.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <button
                                        onClick={() => {
                                            // Generate all images for all breeds
                                            results.forEach((result, index) => {
                                                if (result.colors.length > 0) {
                                                    // Trigger generate for each breed
                                                    const generateButton =
                                                        document.querySelector(
                                                            `[data-breed="${result.breedName}"]`
                                                        ) as HTMLButtonElement;
                                                    if (generateButton) {
                                                        generateButton.click();
                                                    }
                                                }
                                            });
                                        }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
                                    >
                                        🚀 Generate All Images
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-lg p-4"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const updatedResults = [
                                                        ...results,
                                                    ];
                                                    updatedResults[
                                                        index
                                                    ].isExpanded =
                                                        !updatedResults[index]
                                                            .isExpanded;
                                                    setResults(updatedResults);
                                                }}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {result.isExpanded ? "▼" : "▶"}
                                            </button>
                                            <h3 className="text-lg font-semibold">
                                                {result.breedName}
                                            </h3>
                                        </div>
                                        <span
                                            className={`flex items-center gap-2 ${getStatusColor(
                                                result.status
                                            )}`}
                                        >
                                            {getStatusIcon(result.status)}
                                            {result.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                result.status.slice(1)}
                                        </span>
                                    </div>

                                    {result.isExpanded && (
                                        <>
                                            {result.error && (
                                                <div className="text-red-600 mb-3">
                                                    Error: {result.error}
                                                </div>
                                            )}

                                            {result.colors.length > 0 && (
                                                <div className="mb-3">
                                                    <h4 className="font-medium mb-2">
                                                        Colors found:
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.colors.map(
                                                            (
                                                                color,
                                                                colorIndex
                                                            ) => {
                                                                const isSelected =
                                                                    selectedColors[
                                                                        result
                                                                            .breedName
                                                                    ]?.includes(
                                                                        color
                                                                    ) || false;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            colorIndex
                                                                        }
                                                                        onClick={() => {
                                                                            const currentSelected =
                                                                                selectedColors[
                                                                                    result
                                                                                        .breedName
                                                                                ] ||
                                                                                [];
                                                                            const newSelected =
                                                                                isSelected
                                                                                    ? currentSelected.filter(
                                                                                          (
                                                                                              c
                                                                                          ) =>
                                                                                              c !==
                                                                                              color
                                                                                      )
                                                                                    : [
                                                                                          ...currentSelected,
                                                                                          color,
                                                                                      ];

                                                                            setSelectedColors(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [result.breedName]:
                                                                                        newSelected,
                                                                                })
                                                                            );
                                                                        }}
                                                                        className={`px-2 py-1 rounded-full text-sm transition-colors ${
                                                                            isSelected
                                                                                ? "bg-red-100 text-red-800 border-2 border-red-300"
                                                                                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                                        }`}
                                                                    >
                                                                        {color}
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
        </div>
                                            )}

                                            {/* Master Image Section */}
                                            {result.status === "needs_master" && (
                                                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <h4 className="font-medium mb-2 text-yellow-800">
                                                        🎯 Step 1: Generate Master Image
                                                    </h4>
                                                    <p className="text-sm text-yellow-700 mb-3">
                                                        First, generate a master image with "{result.colors[0]}" color. 
                                                        This will be used as reference for all other colors.
                                                    </p>
                                                    <button
                                                        onClick={() => generateMasterImage(result.breedName, index)}
                                                        disabled={generatingMaster[result.breedName]}
                                                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                    >
                                                        {generatingMaster[result.breedName] 
                                                            ? "🎯 Generating Master..." 
                                                            : `🎯 Generate Master (${result.colors[0]})`
                                                        }
                                                    </button>
                                                </div>
                                            )}

                                            {/* Master Image Preview & Approval */}
                                            {result.masterImage && !result.masterImage.isApproved && (
                                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <h4 className="font-medium mb-2 text-blue-800">
                                                        ✅ Master Image Preview ({result.masterImage.color})
                                                    </h4>
                                                    <div className="mb-3">
                                                        <img
                                                            src={result.masterImage.imageData}
                                                            alt={result.masterImage.fileName}
                                                            className="w-48 h-48 object-contain rounded border mx-auto"
                                                        />
                                                    </div>
                                                    <p className="text-sm text-blue-700 mb-3 text-center">
                                                        Is this master image good? It will be used for all other colors.
                                                    </p>
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => {
                                                                const updatedResults = [...results];
                                                                updatedResults[index].masterImage!.isApproved = true;
                                                                setResults(updatedResults);
                                                            }}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                        >
                                                            ✅ Approve & Continue
                                                        </button>
                                                        <button
                                                            onClick={() => generateMasterImage(result.breedName, index)}
                                                            disabled={generatingMaster[result.breedName]}
                                                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                        >
                                                            {generatingMaster[result.breedName] 
                                                                ? "🔄 Regenerating..." 
                                                                : "🔄 Regenerate Master"
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3 flex gap-2">
                                                {/* Only show Generate Color Variants if master is approved */}
                                                {result.masterImage?.isApproved && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            // Set loading state for this breed
                                                            setGeneratingImages(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [result.breedName]:
                                                                        true,
                                                                })
                                                            );

                                                            // Process each color individually with OpenAI
                                                            const processedImages =
                                                                [];

                                                            // Skip the master color since we already have it
                                                            const colorsToGenerate = result.colors.filter(
                                                                color => color !== result.masterImage?.color
                                                            );

                                                            // Add master image to processed images first
                                                            if (result.masterImage) {
                                                                processedImages.push({
                                                                    fileName: result.masterImage.fileName,
                                                                    imageData: result.masterImage.imageData,
                                                                    version: 1,
                                                                    isError: false
                                                                });
                                                            }

                                                            for (const color of colorsToGenerate) {
                                                                try {
                                                                    // Use master image as reference instead of original reference
                                                                    const referenceBase64 = result.masterImage!.imageData;

                                                                    const response =
                                                                        await fetch(
                                                                            "/api/generate-image",
                                                                            {
                                                                                method: "POST",
                                                                                headers:
                                                                                    {
                                                                                        "Content-Type":
                                                                                            "application/json",
                                                                                    },
                                                                                body: JSON.stringify(
                                                                                    {
                                                                                        referenceImageData:
                                                                                            referenceBase64,
                                                                                        breedName:
                                                                                            result.breedName,
                                                                                        animalType:
                                                                                            animalType,
                                                                                        color: color,
                                                                                        apiKey: apiKey,
                                                                                        customPrompt:
                                                                                            customVariantsPrompt,
                                                                                    }
                                                                                ),
                                                                            }
                                                                        );

                                                                    if (
                                                                        !response.ok
                                                                    ) {
                                                                        throw new Error(
                                                                            `Failed to generate image for ${color}`
                                                                        );
                                                                    }

                                                                    const generatedImage =
                                                                        await response.json();

                                                                    // Save the generated image to file
                                                                    try {
                                                                        const saveResponse =
                                                                            await fetch(
                                                                                "/api/save-image",
                                                                                {
                                                                                    method: "POST",
                                                                                    headers:
                                                                                        {
                                                                                            "Content-Type":
                                                                                                "application/json",
                                                                                        },
                                                                                    body: JSON.stringify(
                                                                                        {
                                                                                            imageData:
                                                                                                generatedImage.imageData,
                                                                                            fileName:
                                                                                                generatedImage.fileName,
                                                                                            breedName:
                                                                                                result.breedName,
                                                                                        }
                                                                                    ),
                                                                                }
                                                                            );

                                                                        if (
                                                                            saveResponse.ok
                                                                        ) {
                                                                            const saveResult =
                                                                                await saveResponse.json();
                                                                            console.log(
                                                                                "Image saved:",
                                                                                saveResult.message
                                                                            );
                                                                        }
                                                                    } catch (saveError) {
                                                                        console.error(
                                                                            "Error saving image:",
                                                                            saveError
                                                                        );
                                                                    }

                                                                    // Check if image is valid (has data and not empty)
                                                                    const isImageValid =
                                                                        generatedImage.imageData &&
                                                                        generatedImage
                                                                            .imageData
                                                                            .length >
                                                                            1000; // Basic check for valid image

                                                                    const currentVersion =
                                                                        processedImages.filter(
                                                                            (
                                                                                img
                                                                            ) =>
                                                                                img.fileName.startsWith(
                                                                                    generatedImage.fileName.split(
                                                                                        "."
                                                                                    )[0]
                                                                                )
                                                                        )
                                                                            .length +
                                                                        1;

                                                                    const baseFileName =
                                                                        generatedImage.fileName.split(
                                                                            "."
                                                                        )[0];
                                                                    const extension =
                                                                        generatedImage.fileName.split(
                                                                            "."
                                                                        )[1];
                                                                    const versionedFileName =
                                                                        currentVersion >
                                                                        1
                                                                            ? `${baseFileName}_v0${currentVersion}.${extension}`
                                                                            : generatedImage.fileName;

                                                                    processedImages.push(
                                                                        {
                                                                            fileName:
                                                                                versionedFileName,
                                                                            imageData:
                                                                                generatedImage.imageData, // Keep base64 data for display
                                                                            version:
                                                                                currentVersion,
                                                                            isError:
                                                                                !isImageValid,
                                                                            errorMessage:
                                                                                !isImageValid
                                                                                    ? "Generated image appears to be invalid or empty"
                                                                                    : undefined,
                                                                        }
                                                                    );
                                                                } catch (error) {
                                                                    console.error(
                                                                        `Error generating image for ${color}:`,
                                                                        error
                                                                    );

                                                                    // Show specific error message for organization verification
                                                                    if (
                                                                        error instanceof
                                                                            Error &&
                                                                        error.message.includes(
                                                                            "organization must be verified"
                                                                        )
                                                                    ) {
                                                                        alert(
                                                                            `Error: Your OpenAI organization needs to be verified to use GPT-Image-1. Please visit: https://platform.openai.com/settings/organization/general`
                                                                        );
                                                                        return; // Stop processing other colors
                                                                    }

                                                                    // Continue with other colors even if one fails
                                                                }
                                                            }

                                                            // Update the result with processed images
                                                            const updatedResults =
                                                                [...results];
                                                            updatedResults[
                                                                index
                                                            ].processedImages =
                                                                processedImages;
                                                            updatedResults[
                                                                index
                                                            ].status =
                                                                "completed";
                                                            setResults(
                                                                updatedResults
                                                            );

                                                            alert(
                                                                `Successfully generated ${processedImages.length} color variants for ${result.breedName}!`
                                                            );
                                                        } catch (error) {
                                                            console.error(
                                                                "Error processing images:",
                                                                error
                                                            );
                                                            alert(
                                                                `Error: ${
                                                                    error instanceof
                                                                    Error
                                                                        ? error.message
                                                                        : "Failed to process images"
                                                                }`
                                                            );
                                                        } finally {
                                                            // Clear loading state
                                                            setGeneratingImages(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [result.breedName]:
                                                                        false,
                                                                })
                                                            );
                                                        }
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                    disabled={
                                                        generatingImages[
                                                            result.breedName
                                                        ]
                                                    }
                                                >
                                                    {generatingImages[
                                                        result.breedName
                                                    ]
                                                        ? "⏳ Generating..."
                                                        : `🎨 Generate Color Variants (${result.colors.length - 1} remaining colors)`}
                                                </button>
                                                )}

                                                {/* Regenerate button for selected colors */}
                                                {result.masterImage?.isApproved &&
                                                selectedColors[
                                                    result.breedName
                                                ] &&
                                                    selectedColors[
                                                        result.breedName
                                                    ].length > 0 && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    // Set loading state for this breed
                                                                    setGeneratingImages(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            [result.breedName]:
                                                                                true,
                                                                        })
                                                                    );

                                                                    // Check if master image is approved
                                                                    if (
                                                                        !result.masterImage?.isApproved
                                                                    ) {
                                                                        alert(
                                                                            "Please approve master image first!"
                                                                        );
                                                                        return;
                                                                    }

                                                                    // Use master image as reference
                                                                    const referenceBase64 = result.masterImage.imageData;

                                                                    // Process each selected color
                                                                    const selectedColorsList =
                                                                        selectedColors[
                                                                            result
                                                                                .breedName
                                                                        ];
                                                                    const processedImages =
                                                                        [];

                                                                    for (const color of selectedColorsList) {
                                                                        try {
                                                                            const response =
                                                                                await fetch(
                                                                                    "/api/generate-image",
                                                                                    {
                                                                                        method: "POST",
                                                                                        headers:
                                                                                            {
                                                                                                "Content-Type":
                                                                                                    "application/json",
                                                                                            },
                                                                                        body: JSON.stringify(
                                                                                            {
                                                                                                referenceImageData:
                                                                                                    referenceBase64,
                                                                                                breedName:
                                                                                                    result.breedName,
                                                                                                animalType:
                                                                                                    animalType,
                                                                                                color: color,
                                                                                                apiKey: apiKey,
                                                                                                customPrompt:
                                                                                                    customPrompt,
                                                                                            }
                                                                                        ),
                                                                                    }
                                                                                );

                                                                            if (
                                                                                !response.ok
                                                                            ) {
                                                                                throw new Error(
                                                                                    `Failed to generate image for ${color}`
                                                                                );
                                                                            }

                                                                            const generatedImage =
                                                                                await response.json();

                                                                            // Save the generated image to file
                                                                            try {
                                                                                const saveResponse =
                                                                                    await fetch(
                                                                                        "/api/save-image",
                                                                                        {
                                                                                            method: "POST",
                                                                                            headers:
                                                                                                {
                                                                                                    "Content-Type":
                                                                                                        "application/json",
                                                                                                },
                                                                                            body: JSON.stringify(
                                                                                                {
                                                                                                    imageData:
                                                                                                        generatedImage.imageData,
                                                                                                    fileName:
                                                                                                        generatedImage.fileName,
                                                                                                    breedName:
                                                                                                        result.breedName,
                                                                                                }
                                                                                            ),
                                                                                        }
                                                                                    );

                                                                                if (
                                                                                    saveResponse.ok
                                                                                ) {
                                                                                    const saveResult =
                                                                                        await saveResponse.json();
                                                                                    console.log(
                                                                                        "Image saved:",
                                                                                        saveResult.message
                                                                                    );
                                                                                }
                                                                            } catch (saveError) {
                                                                                console.error(
                                                                                    "Error saving image:",
                                                                                    saveError
                                                                                );
                                                                            }

                                                                            // Check if image is valid
                                                                            const isImageValid =
                                                                                generatedImage.imageData &&
                                                                                generatedImage
                                                                                    .imageData
                                                                                    .length >
                                                                                    1000;

                                                                            const currentVersion =
                                                                                processedImages.filter(
                                                                                    (
                                                                                        img
                                                                                    ) =>
                                                                                        img.fileName.startsWith(
                                                                                            generatedImage.fileName.split(
                                                                                                "."
                                                                                            )[0]
                                                                                        )
                                                                                )
                                                                                    .length +
                                                                                1;

                                                                            const baseFileName =
                                                                                generatedImage.fileName.split(
                                                                                    "."
                                                                                )[0];
                                                                            const extension =
                                                                                generatedImage.fileName.split(
                                                                                    "."
                                                                                )[1];
                                                                            const versionedFileName =
                                                                                currentVersion >
                                                                                1
                                                                                    ? `${baseFileName}_v0${currentVersion}.${extension}`
                                                                                    : generatedImage.fileName;

                                                                            processedImages.push(
                                                                                {
                                                                                    fileName:
                                                                                        versionedFileName,
                                                                                    imageData:
                                                                                        generatedImage.imageData,
                                                                                    version:
                                                                                        currentVersion,
                                                                                    isError:
                                                                                        !isImageValid,
                                                                                    errorMessage:
                                                                                        !isImageValid
                                                                                            ? "Generated image appears to be invalid or empty"
                                                                                            : undefined,
                                                                                }
                                                                            );
                                                                        } catch (error) {
                                                                            console.error(
                                                                                `Error generating image for ${color}:`,
                                                                                error
                                                                            );

                                                                            if (
                                                                                error instanceof
                                                                                    Error &&
                                                                                error.message.includes(
                                                                                    "organization must be verified"
                                                                                )
                                                                            ) {
                                                                                alert(
                                                                                    `Error: Your OpenAI organization needs to be verified to use GPT-Image-1. Please visit: https://platform.openai.com/settings/organization/general`
                                                                                );
                                                                                return;
                                                                            }
                                                                        }
                                                                    }

                                                                    // Update the result with new processed images
                                                                    const updatedResults =
                                                                        [
                                                                            ...results,
                                                                        ];
                                                                    updatedResults[
                                                                        index
                                                                    ].processedImages =
                                                                        [
                                                                            ...updatedResults[
                                                                                index
                                                                            ]
                                                                                .processedImages,
                                                                            ...processedImages,
                                                                        ];
                                                                    setResults(
                                                                        updatedResults
                                                                    );

                                                                    alert(
                                                                        `Successfully regenerated ${processedImages.length} images for ${result.breedName}!`
                                                                    );
                                                                } catch (error) {
                                                                    console.error(
                                                                        "Error regenerating images:",
                                                                        error
                                                                    );
                                                                    alert(
                                                                        `Error: ${
                                                                            error instanceof
                                                                            Error
                                                                                ? error.message
                                                                                : "Failed to regenerate images"
                                                                        }`
                                                                    );
                                                                } finally {
                                                                    // Clear loading state
                                                                    setGeneratingImages(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            [result.breedName]:
                                                                                false,
                                                                        })
                                                                    );
                                                                }
                                                            }}
                                                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                            disabled={
                                                                generatingImages[
                                                                    result
                                                                        .breedName
                                                                ]
                                                            }
                                                        >
                                                            🔄 Regenerate
                                                            Selected (
                                                            {
                                                                selectedColors[
                                                                    result
                                                                        .breedName
                                                                ].length
                                                            }{" "}
                                                            colors)
                                                        </button>
                                                    )}
                                            </div>

                                            {/* Display processed images */}
                                            {result.processedImages.length >
                                                0 && (
                                                <div className="mt-4">
                                                    <h4 className="font-medium mb-2">
                                                        Generated images:
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {result.processedImages.map(
                                                            (
                                                                image,
                                                                imageIndex
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        imageIndex
                                                                    }
                                                                    className={`rounded-lg p-3 text-center ${
                                                                        image.isError
                                                                            ? "bg-red-50 border border-red-200"
                                                                            : "bg-gray-100"
                                                                    }`}
                                                                >
                                                                    {image.imageData ? (
                                                                        <img
                                                                            src={
                                                                                image.imageData
                                                                            }
                                                                            alt={
                                                                                image.fileName
                                                                            }
                                                                            className="w-full h-32 object-contain rounded mb-2"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center">
                                                                            <span className="text-gray-500 text-xs">
                                                                                Loading...
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-xs text-gray-600 truncate">
                                                                        {
                                                                            image.fileName
                                                                        }
                                                                    </p>
                                                                    <button
                                                                        onClick={() => {
                                                                            // Download the image
                                                                            const link =
                                                                                document.createElement(
                                                                                    "a"
                                                                                );
                                                                            link.href =
                                                                                image.imageData ||
                                                                                "";
                                                                            link.download =
                                                                                image.fileName;
                                                                            document.body.appendChild(
                                                                                link
                                                                            );
                                                                            link.click();
                                                                            document.body.removeChild(
                                                                                link
                                                                            );
                                                                        }}
                                                                        className="mt-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs w-full"
                                                                    >
                                                                        📥
                                                                        Download
                                                                    </button>

                                                                    {image.isError && (
                                                                        <div className="mt-2">
                                                                            <p className="text-xs text-red-600 mb-1">
                                                                                {
                                                                                    image.errorMessage
                                                                                }
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                Select the color above and click "Regenerate Selected"
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Prompts Section */}
                <div className="bg-yellow-50 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-semibold mb-6">
                        🎨 Custom Prompts Configuration
                    </h3>
                    <p className="text-gray-700 mb-6">
                        Customize all prompts used in the generation process. Use{" "}
                        <code className="bg-gray-200 px-1 rounded">
                            {"{animalType}"}
                        </code>
                        ,{" "}
                        <code className="bg-gray-200 px-1 rounded">
                            {"{breedName}"}
                        </code>{" "}
                        and{" "}
                        <code className="bg-gray-200 px-1 rounded">
                            {"{color}"}
                        </code>{" "}
                        as placeholders.
                    </p>

                    <div className="space-y-6">
                        {/* Colors Detection Prompt */}
                        <div className="bg-white rounded-lg p-4 border border-yellow-200">
                            <h4 className="font-medium mb-2 text-blue-800">
                                🔍 Colors Detection Prompt
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Used to get realistic colors from ChatGPT for each breed.
                            </p>
                            <textarea
                                value={customColorsPrompt}
                                onChange={(e) => setCustomColorsPrompt(e.target.value)}
                                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter colors detection prompt..."
                            />
                        </div>

                        {/* Master Generation Prompt */}
                        <div className="bg-white rounded-lg p-4 border border-yellow-200">
                            <h4 className="font-medium mb-2 text-green-800">
                                🎯 Master Generation Prompt
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Used to generate the first master image with accurate breed characteristics.
                            </p>
                            <textarea
                                value={customMasterPrompt}
                                onChange={(e) => setCustomMasterPrompt(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Enter master generation prompt..."
                            />
                        </div>

                        {/* Color Variants Prompt */}
                        <div className="bg-white rounded-lg p-4 border border-yellow-200">
                            <h4 className="font-medium mb-2 text-purple-800">
                                🔄 Color Variants Prompt
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Used to generate color variants based on the approved master image.
                            </p>
                            <textarea
                                value={customVariantsPrompt}
                                onChange={(e) => setCustomVariantsPrompt(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter color variants prompt..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 text-sm text-gray-600">
                        <strong>💡 Tips:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Use <code>{"{animalType}"}</code> for animal type (Dog, Cat, etc.)</li>
                            <li>Use <code>{"{breedName}"}</code> for specific breed (Husky, Persian, etc.)</li>
                            <li>Use <code>{"{color}"}</code> for color variations</li>
                            <li>Colors prompt should return natural fur colors only</li>
                            <li>Master prompt should focus on breed accuracy + reference style</li>
                            <li>Variants prompt should only change color, keep everything else identical</li>
                        </ul>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-semibold mb-3">
                        📋 How to use:
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                        <li>Enter your OpenAI API key above</li>
                        <li>
                            Create a text file with dog breed names (one per
                            line)
                        </li>
                        <li>Upload the text file using the button above</li>
                        <li>
                            Wait for the AI to process and generate color
                            variants
                        </li>
                        <li>
                            Use "Generate All Images" to create all variants at
                            once
                        </li>
                        <li>Download the generated images</li>
                    </ol>
                </div>
            </div>
    </div>
  );
}
