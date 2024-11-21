"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocr = ocr;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const fs_1 = __importDefault(require("fs"));
async function ocr({ filePath, apiKey = process.env.GROQ_API_KEY, model = "llama-3.2-11b-vision-preview", }) {
    if (!filePath) {
        throw new Error("filePath is required");
    }
    const groq = new groq_sdk_1.default({ apiKey: apiKey, dangerouslyAllowBrowser: true });
    let finalMarkdown = await getMarkDown({ groq, visionLLM: model, filePath });
    // Validate output
    if (!finalMarkdown || finalMarkdown.trim().length === 0) {
        throw new Error("No content was extracted from the image");
    }
    return finalMarkdown;
}
async function getMarkDown({ groq, visionLLM, filePath, }) {
    const systemPrompt = `You are a precise OCR system. Extract text from the image and format it as clean Markdown. Rules:

1. Format:
   - Use proper markdown headings (#, ##, ###)
   - Use bullet lists (- or *) for itemized content
   - Use numbered lists (1., 2., etc.) for sequential items
   - Use tables with | separator for tabular data
   - Preserve original text formatting (bold, italic) when clear
   
2. Content:
   - Extract ALL text visible in the image
   - Maintain the original text hierarchy
   - Keep all numbers and amounts exactly as shown
   - Include dates and times in their original format
   
3. Structure:
   - Start with the most prominent text as a heading
   - Group related items together
   - Use horizontal rules (---) to separate major sections
   
4. Output:
   - Return ONLY the markdown content
   - Do not explain, describe, or analyze the content
   - Do not include [END] or similar markers
   - Ensure the markdown is valid and well-formatted`;
    try {
        const finalImageUrl = isRemoteFile(filePath)
            ? filePath
            : `data:image/jpeg;base64,${encodeImage(filePath)}`;
        const output = await groq.chat.completions.create({
            model: visionLLM,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: systemPrompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: finalImageUrl,
                            },
                        },
                    ],
                },
            ],
        });
        const content = output.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content received from API");
        }
        return content;
    }
    catch (error) {
        throw new Error(`Failed to process image: ${error.message}`);
    }
}
function encodeImage(imagePath) {
    try {
        const imageBuffer = fs_1.default.readFileSync(imagePath);
        return imageBuffer.toString('base64');
    }
    catch (error) {
        throw new Error(`Failed to read image file: ${error.message}`);
    }
}
function isRemoteFile(filePath) {
    return filePath.startsWith("http://") || filePath.startsWith("https://");
}
