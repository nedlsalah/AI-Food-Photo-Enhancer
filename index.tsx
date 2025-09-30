/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Modality } from '@google/genai';

// --- DOM ELEMENT SELECTION ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const enhanceBtn = document.getElementById('enhance-btn') as HTMLButtonElement;
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const resultsContainer = document.getElementById('results-container');
const errorMessage = document.getElementById('error-message');
const dropZonePrompt = document.getElementById('drop-zone-prompt');
const dropZonePreview = document.getElementById('drop-zone-preview');
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const changePhotoBtn = document.getElementById('change-photo-btn');
const resultsGrid = document.getElementById('results-grid');
const downloadAllBtn = document.getElementById('download-all-btn') as HTMLButtonElement;
const styleSelectionGrid = document.getElementById('style-selection-grid');
const customPromptInput = document.getElementById('custom-prompt-input') as HTMLTextAreaElement;

// --- STATE MANAGEMENT ---
let uploadedFile: File | null = null;
let originalImageURL: string = '';
const selectedStyles = new Set<string>();
type GeneratedResult = {
    status: 'fulfilled' | 'rejected';
    styleName: string;
    styleTitle: string;
    src?: string;
    fileName?: string;
    reason?: string;
};
let generatedResults: GeneratedResult[] = [];


// --- API & PROMPT CONFIGURATION ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STYLE_PROMPTS = {
    minimalist: { title: 'Minimalist Studio', prompt: `Enhance this food photograph for a professional menu or advertisement. Apply a minimalist studio look. Replace the background with a clean, solid, light-colored or subtly textured surface. Adjust lighting to be soft and even, creating gentle highlights and shadows that accentuate the food's texture. Make the colors vibrant and true-to-life. The final image should look clean, appetizing, and high-end, with no text or watermarks.`},
    rustic: { title: 'Warm Rustic', prompt: `Enhance this food photograph with a warm, rustic, and cozy aesthetic. Replace the background with a natural texture like dark wood, slate, or craft paper. Adjust the lighting to be warm and directional, as if from a nearby window or a soft lamp, creating a comforting and artisanal feel. Enhance the colors to be rich and deep. The final image should feel homely, delicious, and inviting, with no text or watermarks.`},
    dark: { title: 'Luxury Dark', prompt: `Enhance this food photograph to give it a luxury, dark-mood aesthetic suitable for a high-end restaurant. Replace the background with a dark, elegant surface like black marble, dark slate, or a dimly lit restaurant setting. Apply dramatic, focused lighting (a "spotlight" effect) that highlights the food's key features while letting the surroundings fall into shadow. Deepen the colors and increase contrast for a bold, sophisticated look. The final image should feel premium, dramatic, and decadent, with no text or watermarks.`},
    bright: { title: 'Bright & Airy', prompt: `Enhance this food photograph for a bright, airy, and fresh look, perfect for social media like Instagram. Replace the background with a light and clean surface, such as white marble, light-colored wood, or a pastel-colored backdrop. Make the lighting bright, natural, and diffuse, minimizing harsh shadows. Boost the saturation and vibrancy of the colors to make the food pop. The final image should feel clean, cheerful, fresh, and highly shareable, with no text or watermarks.`},
    action: { title: 'Action Shot', prompt: `Enhance this food photograph to capture a dynamic 'in-the-moment' action shot. If appropriate for the food, add a human element like hands holding, cutting, or serving the dish, or even a mouth about to take a bite. The background should be slightly blurred to focus on the action. Make the lighting appear natural and active, and enhance colors to be lively and appealing. The final image should feel energetic, relatable, and perfect for a social media story, with no text or watermarks.`},
    flatlay: { title: 'Top-Down Flat Lay', prompt: `Transform this food photograph into a stylish top-down 'flat lay' composition, popular on social media. Arrange the main dish artfully and surround it with complementary props like cutlery, napkins, fresh ingredients, or a drink. A human element, like hands arranging the scene, can be included. Use a clean, textured background (like marble, wood, or linen). Ensure lighting is bright and even. The final image should be well-composed, trendy, and visually satisfying, with no text or watermarks.`},
    product: { title: 'Clean Product Shot', prompt: `Recreate this food photograph as a high-end commercial product shot. The food should be the hero on a perfectly clean, seamless white or light gray studio background. Use bright, crisp, and even studio lighting to eliminate harsh shadows and highlight the food's fresh textures and colors. The final image must be sharp, vibrant, and look ready for a premium food package or advertisement, with no text or watermarks.` },
    editorial: { title: 'Magazine Editorial', prompt: `Transform this food photograph into a sophisticated editorial shot for a gourmet magazine. The composition should be artful and tell a story, using complementary, high-end props like linen napkins, antique silverware, or glassware. The lighting should be moody and atmospheric, creating depth with soft highlights and deep shadows. The final image should look elegant, curated, and aspirational, with no text or watermarks.` },
    dynamic: { title: 'Dynamic Studio Shot', prompt: `Recreate this food photograph as a dynamic studio action shot. Capture a moment of motion, like a sauce being drizzled, steam rising, powder being dusted, or a liquid splashing. Use high-speed photography techniques with studio lighting to freeze the action crisply. The background should be clean and non-distracting to emphasize the movement. The final image should be energetic, dramatic, and high-impact, with no text or watermarks.` },
    graphic: { title: 'Graphic Composition', prompt: `Transform this food photograph into a modern, graphic composition. Arrange the food or its components in a deliberate, artful pattern or a minimalist layout on a solid, bold-colored background. Use hard, direct studio lighting to create defined shadows and a contemporary, pop-art feel. The focus should be on shape, color, and repetition. The final image should be stylish, bold, and visually striking, with no text or watermarks.` },
};

// --- INITIALIZATION ---
function renderStyleSelector() {
    if (!styleSelectionGrid) return;
    styleSelectionGrid.innerHTML = '';
    // Render predefined styles
    for (const [styleName, { title }] of Object.entries(STYLE_PROMPTS)) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.dataset.style = styleName;
        card.innerHTML = `
            <div class="style-card-checkbox"></div>
            <label>${title}</label>
        `;
        card.addEventListener('click', () => toggleStyleSelection(styleName, card));
        styleSelectionGrid.appendChild(card);
    }
    // Render custom style
    const customCard = document.createElement('div');
    customCard.className = 'style-card custom-style-card';
    customCard.dataset.style = 'custom';
    customCard.innerHTML = `
        <div class="custom-header">
            <div class="style-card-checkbox"></div>
            <label>Custom Style</label>
        </div>
        <textarea id="custom-prompt-input" placeholder="Describe your desired enhancement..." rows="3"></textarea>
    `;
    styleSelectionGrid.appendChild(customCard);
    customCard.querySelector('.custom-header').addEventListener('click', () => toggleStyleSelection('custom', customCard));
}


// --- EVENT LISTENERS ---
dropZone.addEventListener('click', () => fileInput.click());
changePhotoBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
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

enhanceBtn.addEventListener('click', generateSelectedStyles);
downloadAllBtn.addEventListener('click', downloadAll);


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
    const hasFile = !!uploadedFile;
    const hasSelection = selectedStyles.size > 0;
    enhanceBtn.disabled = !hasFile || !hasSelection;

    if (hasSelection) {
        enhanceBtn.textContent = `Generate ${selectedStyles.size} Style(s)`;
    } else {
        enhanceBtn.textContent = 'Select a Style to Generate';
    }
}

function showLoader(show: boolean, text: string = 'Processing...') {
    loaderText.textContent = text;
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
        originalImageURL = e.target?.result as string;
        previewImage.src = originalImageURL;
        dropZonePrompt.classList.add('hidden');
        dropZonePreview.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsGrid.innerHTML = '';
        generatedResults = [];
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

function toggleStyleSelection(styleName: string, cardElement: HTMLElement) {
    if (selectedStyles.has(styleName)) {
        selectedStyles.delete(styleName);
        cardElement.classList.remove('selected');
    } else {
        selectedStyles.add(styleName);
        cardElement.classList.add('selected');
    }
    updateEnhanceButtonState();
}

function downloadAll() {
    const successfulResults = generatedResults.filter(r => r.status === 'fulfilled');
    successfulResults.forEach((result, index) => {
        setTimeout(() => {
            if (result.src && result.fileName) {
                const link = document.createElement('a');
                link.href = result.src;
                link.download = result.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }, index * 200); // Stagger downloads to prevent browser blocking
    });
}


// --- CORE FUNCTIONS ---

async function generateSingleStyle(styleName: string, styleTitle: string, prompt: string, base64Data: string, mimeType: string) {
    const resultItem = document.querySelector(`.result-item[data-style="${styleName}"]`);
    const imageContainer = resultItem?.querySelector('.image-container');
    const downloadContainer = resultItem?.querySelector('.download-container');

    if (!resultItem || !imageContainer || !downloadContainer) return;

    try {
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

        const parts = response.candidates?.[0]?.content?.parts;
        const imagePart = parts?.find(p => p.inlineData);

        if (imagePart?.inlineData) {
            const { data: enhancedBase64, mimeType: enhancedMimeType } = imagePart.inlineData;
            const src = `data:${enhancedMimeType};base64,${enhancedBase64}`;
            const extension = enhancedMimeType.split('/')[1] || 'jpg';
            const fileName = `enhanced-${uploadedFile.name.split('.')[0]}-${styleName}.${extension}`;

            imageContainer.innerHTML = `
                <img class="generated-image" src="${src}" alt="Enhanced image in ${styleTitle} style">
                <img class="original-image" src="${originalImageURL}" alt="Original image">
            `;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = src;
            downloadLink.download = fileName;
            downloadLink.textContent = 'Download';
            downloadLink.classList.add('button', 'button-small');
            downloadContainer.appendChild(downloadLink);

            return {
                status: 'fulfilled',
                styleName,
                styleTitle,
                src,
                fileName,
            };
        } else {
            const refusalText = parts?.find(p => p.text)?.text || 'No image data returned.';
            throw new Error(refusalText);
        }
    } catch (error) {
        imageContainer.innerHTML = `<p>Failed to generate this style. Please try again.</p>`;
        resultItem.classList.add('error');
        console.error(`Error for style ${styleName}:`, error);
        return {
            status: 'rejected',
            styleName,
            styleTitle,
            reason: error instanceof Error ? error.message : String(error),
        };
    }
}

async function generateSelectedStyles() {
    if (!uploadedFile || selectedStyles.size === 0) {
        displayError('Please upload a photo and select at least one style.');
        return;
    }

    showLoader(true, 'Preparing your image...');
    enhanceBtn.disabled = true;
    clearError();
    resultsGrid.innerHTML = '';
    generatedResults = [];
    resultsContainer.classList.remove('hidden');
    downloadAllBtn.classList.add('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    // Render placeholders
    selectedStyles.forEach(styleName => {
        const title = styleName === 'custom' ? 'Custom Style' : STYLE_PROMPTS[styleName]?.title || 'Unknown Style';
        const placeholder = document.createElement('div');
        placeholder.className = 'result-item';
        placeholder.dataset.style = styleName;
        placeholder.innerHTML = `
            <h3>${title}</h3>
            <div class="image-container">
                <div class="spinner"></div>
            </div>
            <div class="download-container"></div>
        `;
        resultsGrid.appendChild(placeholder);
    });

    try {
        const base64Data = await fileToBase64(uploadedFile);
        const mimeType = uploadedFile.type;
        showLoader(false);

        const generationPromises = Array.from(selectedStyles).map(styleName => {
            const isCustom = styleName === 'custom';
            const styleInfo = isCustom ? { title: 'Custom Style' } : STYLE_PROMPTS[styleName];
            const prompt = isCustom 
                ? (document.getElementById('custom-prompt-input') as HTMLTextAreaElement).value 
                : styleInfo.prompt;
            
            if (!prompt) {
                 // Skip if custom prompt is empty
                const resultItem = document.querySelector(`.result-item[data-style="custom"]`);
                resultItem.querySelector('.image-container').innerHTML = '<p>Custom prompt cannot be empty.</p>';
                resultItem.classList.add('error');
                return Promise.resolve({ status: 'rejected', styleName, styleTitle: 'Custom Style', reason: 'Empty prompt'});
            }

            return generateSingleStyle(styleName, styleInfo.title, prompt, base64Data, mimeType);
        });

        const results = await Promise.all(generationPromises);
        generatedResults = results.filter(r => r) as GeneratedResult[];

        if (generatedResults.some(r => r.status === 'fulfilled')) {
            downloadAllBtn.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error during generation process:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred. Please try again.';
        displayError(message);
        showLoader(false);
    } finally {
        updateEnhanceButtonState();
    }
}

// --- ON SCRIPT LOAD ---
document.addEventListener('DOMContentLoaded', renderStyleSelector);
