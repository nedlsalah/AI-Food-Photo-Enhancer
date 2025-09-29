/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Modality } from '@google/genai';

// --- DOM ELEMENT SELECTION ---
const dropZone = document.getElementById('drop-zone');
// FIX: Cast to HTMLInputElement to allow access to its properties.
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const styleSelector = document.getElementById('style-selector');
// FIX: Cast to HTMLButtonElement to allow access to the 'disabled' property.
const enhanceBtn = document.getElementById('enhance-btn') as HTMLButtonElement;
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
// FIX: Cast to HTMLImageElement to allow access to the 'src' property.
const originalImage = document.getElementById('original-image') as HTMLImageElement;
// FIX: Cast to HTMLImageElement to allow access to the 'src' property.
const enhancedImage = document.getElementById('enhanced-image') as HTMLImageElement;
// FIX: Cast to HTMLAnchorElement to allow access to 'href' and 'download' properties.
const downloadBtn = document.getElementById('download-btn') as HTMLAnchorElement;
const errorMessage = document.getElementById('error-message');
const dropZonePrompt = document.getElementById('drop-zone-prompt');
const dropZonePreview = document.getElementById('drop-zone-preview');
// FIX: Cast to HTMLImageElement to allow access to the 'src' property.
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const changePhotoBtn = document.getElementById('change-photo-btn');

// --- STATE MANAGEMENT ---
let uploadedFile: File | null = null;
let selectedStyle: string | null = null;

// --- API & PROMPT CONFIGURATION ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STYLE_PROMPTS = {
    minimalist: `Enhance this food photograph for a professional menu or advertisement. Apply a minimalist studio look. Replace the background with a clean, solid, light-colored or subtly textured surface. Adjust lighting to be soft and even, creating gentle highlights and shadows that accentuate the food's texture. Make the colors vibrant and true-to-life. The final image should look clean, appetizing, and high-end, with no text or watermarks.`,
    rustic: `Enhance this food photograph with a warm, rustic, and cozy aesthetic. Replace the background with a natural texture like dark wood, slate, or craft paper. Adjust the lighting to be warm and directional, as if from a nearby window or a soft lamp, creating a comforting and artisanal feel. Enhance the colors to be rich and deep. The final image should feel homely, delicious, and inviting, with no text or watermarks.`,
    dark: `Enhance this food photograph to give it a luxury, dark-mood aesthetic suitable for a high-end restaurant. Replace the background with a dark, elegant surface like black marble, dark slate, or a dimly lit restaurant setting. Apply dramatic, focused lighting (a "spotlight" effect) that highlights the food's key features while letting the surroundings fall into shadow. Deepen the colors and increase contrast for a bold, sophisticated look. The final image should feel premium, dramatic, and decadent, with no text or watermarks.`,
    bright: `Enhance this food photograph for a bright, airy, and fresh look, perfect for social media like Instagram. Replace the background with a light and clean surface, such as white marble, light-colored wood, or a pastel-colored backdrop. Make the lighting bright, natural, and diffuse, minimizing harsh shadows. Boost the saturation and vibrancy of the colors to make the food pop. The final image should feel clean, cheerful, fresh, and highly shareable, with no text or watermarks.`,
    action: `Enhance this food photograph to capture a dynamic 'in-the-moment' action shot. If appropriate for the food, add a human element like hands holding, cutting, or serving the dish, or even a mouth about to take a bite. The background should be slightly blurred to focus on the action. Make the lighting appear natural and active, and enhance colors to be lively and appealing. The final image should feel energetic, relatable, and perfect for a social media story, with no text or watermarks.`,
    flatlay: `Transform this food photograph into a stylish top-down 'flat lay' composition, popular on social media. Arrange the main dish artfully and surround it with complementary props like cutlery, napkins, fresh ingredients, or a drink. A human element, like hands arranging the scene, can be included. Use a clean, textured background (like marble, wood, or linen). Ensure lighting is bright and even. The final image should be well-composed, trendy, and visually satisfying, with no text or watermarks.`,
};

// --- EVENT LISTENERS ---
dropZone.addEventListener('click', () => fileInput.click());
changePhotoBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    // FIX: Cast e.target to HTMLInputElement to access the 'files' property.
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

styleSelector.addEventListener('change', (e) => {
    // FIX: Cast e.target to HTMLInputElement to access 'name' and 'value' properties.
    const target = e.target as HTMLInputElement;
    if (target.name === 'style') {
        selectedStyle = target.value;
        updateEnhanceButtonState();
    }
});

enhanceBtn.addEventListener('click', enhanceImage);

// --- HELPER FUNCTIONS ---
function displayError(message: string) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

function updateEnhanceButtonState() {
    enhanceBtn.disabled = !(uploadedFile && selectedStyle);
}

function showLoader(show: boolean) {
    loader.classList.toggle('hidden', !show);
}

function handleFile(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        displayError('Please upload a valid JPG or PNG image.');
        return;
    }
    uploadedFile = file;
    clearError();
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        
        // Show thumbnail in dropzone
        previewImage.src = imageUrl;
        dropZonePrompt.classList.add('hidden');
        dropZonePreview.classList.remove('hidden');
        
        // Also show original image in the main results area
        originalImage.src = imageUrl;
        resultsContainer.classList.remove('hidden');
        
        // Reset enhanced image area
        enhancedImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        downloadBtn.classList.add('hidden');
    };
    reader.readAsDataURL(file);

    updateEnhanceButtonState();
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                const base64String = result.split(',')[1];
                resolve(base64String);
            } else {
                reject(new Error('File could not be read as a base64 string.'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
}

// --- CORE FUNCTION ---
async function enhanceImage() {
    if (!uploadedFile || !selectedStyle) {
        displayError('Please upload a photo and select a style.');
        return;
    }

    showLoader(true);
    enhanceBtn.disabled = true;
    clearError();

    try {
        const base64Data = await fileToBase64(uploadedFile);
        const mimeType = uploadedFile.type;
        const prompt = STYLE_PROMPTS[selectedStyle];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        let enhancedBase64: string | null = null;
        let enhancedMimeType: string | null = null;

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    enhancedBase64 = part.inlineData.data;
                    enhancedMimeType = part.inlineData.mimeType;
                    break;
                }
            }
        }

        if (enhancedBase64 && enhancedMimeType) {
            enhancedImage.src = `data:${enhancedMimeType};base64,${enhancedBase64}`;
            downloadBtn.href = enhancedImage.src;
            downloadBtn.download = `enhanced-${uploadedFile.name}`;
            downloadBtn.classList.remove('hidden');
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            const refusalText = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
            let message = 'No image was generated. The model may have refused the request.';
            if (refusalText) {
                message += ` Response: "${refusalText}"`;
            }
            throw new Error(message);
        }

    } catch (error) {
        console.error('Error enhancing image:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred. Please try again.';
        displayError(message);
    } finally {
        showLoader(false);
        enhanceBtn.disabled = false;
    }
}