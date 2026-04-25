import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });

export interface ExtractedMedication {
  name: string;
  dosage: string;
  dosagePerTime: number;
  unit: string;
  frequency: 'daily' | 'twice_daily' | 'thrice_daily' | 'custom';
  notes: string;
  category: string;
}

export const analyzeMedicationImage = async (base64Image: string, mimeType: string): Promise<ExtractedMedication> => {
  const prompt = "你是一个专业的药剂师助手。请分析这张图片（可能是处方单、药盒或订单截图），提取药品信息。如果无法确定某项信息，请给出最可能的猜测。";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "药品名称" },
          dosage: { type: Type.STRING, description: "规格（如 100mg*30片）" },
          dosagePerTime: { type: Type.NUMBER, description: "单次剂量（数字）" },
          unit: { type: Type.STRING, description: "单位（片/粒/袋/ml）" },
          frequency: { 
            type: Type.STRING, 
            description: "频次",
            enum: ['daily', 'twice_daily', 'thrice_daily', 'custom']
          },
          notes: { type: Type.STRING, description: "用药说明或备注" },
          category: { type: Type.STRING, description: "药品用途分类（如 降压、降糖、补钙）" },
        },
        required: ["name", "dosage", "dosagePerTime", "unit", "frequency", "notes", "category"],
      },
    },
  });

  try {
    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("模型返回数据格式错误");
  }
};
