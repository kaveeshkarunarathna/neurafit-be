import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PoseAnalyzeDto } from './dto/pose-analyze.dto';
import { WorkoutRecommendDto } from './dto/workout-recommend.dto';
import { MealRecommendDto } from './dto/meal-recommend.dto';
import { ChatDto } from './dto/chat.dto';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../database/prisma.service';
import { RagService } from '../rag/rag.service';

// ─── AI Service ────────────────────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly aiServiceUrl: string;
  private readonly genai: GoogleGenAI;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private ragService: RagService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('ai.serviceUrl') ||
      'http://localhost:8000';
    
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genai = new GoogleGenAI({ apiKey });
    } else {
      console.warn('GEMINI_API_KEY is not set. AI features will error out.');
    }
  }

  private ensureConfigured() {
    if (!this.genai) {
      throw new InternalServerErrorException('AI Service is not configured. Set GEMINI_API_KEY in .env');
    }
  }

  private parseJsonResponse(rawText: string): any {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned);
  }

  private async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new InternalServerErrorException('User not found.');
    return user;
  }

  private formatUserContext(user: any): string {
    return `User Profile:
- Name: ${user.name}
- Age: ${user.age || 'Not provided'}
- Height: ${user.height ? user.height + ' cm' : 'Not provided'}
- Weight: ${user.weight ? user.weight + ' kg' : 'Not provided'}
- Target Weight: ${user.targetWeight ? user.targetWeight + ' kg' : 'Not provided'}
- Fitness Goal: ${user.fitnessGoal ? user.fitnessGoal.replace('_', ' ') : 'Not provided'}
- Diet Preference: ${user.dietPreference !== 'NONE' ? user.dietPreference : 'No strict preference'}
- Activity Level: ${user.activityLevel.replace('_', ' ')}
- Medical Conditions / Injuries: ${user.medicalConditions || 'None reported'}`;
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────

  async getChatHistory(userId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: messages,
      message: 'Chat history retrieved successfully',
    };
  }

  async chat(userId: string, dto: ChatDto) {
    this.ensureConfigured();

    const userMessage = await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: dto.message },
    });

    const user = await this.getUserProfile(userId);

    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    const history = recentMessages.reverse().slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = `You are NeuraFiT AI, an expert, encouraging personal trainer and nutritionist. 
Your tone is professional, extremely supportive, and concise (use short paragraphs and structured bullet points when helpful). 
Do NOT use markdown headers (like # or ##) unless presenting a full plan, just use bold text and lists.

${this.formatUserContext(user)}

CRITICAL SAFETY CONSTRAINT: If the user has documented medical conditions or injuries, you MUST factor them into EVERY piece of advice. Prioritize their safety, suggest regressions if needed, and explicitly warn against movements that could exacerbate their condition.

Always tailor your advice explicitly to these metrics and goals. DO NOT ask the user for information you already have above. Answer their questions directly.`;

    let ragContext = '';
    try {
      ragContext = await this.ragService.getContext(dto.message, { topK: 5 });
    } catch (error) {
      console.warn('RAG context retrieval failed (non-blocking):', error);
    }

    const fullSystemInstruction = ragContext
      ? `${systemInstruction}\n${ragContext}`
      : systemInstruction;

    try {
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: dto.message }] }
        ],
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: 0.7,
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't generate a response at this time.";

      const aiMessage = await this.prisma.chatMessage.create({
        data: { userId, role: 'ai', content: aiText },
      });

      return {
        data: { userMessage, aiMessage },
        message: 'Message processed successfully',
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new InternalServerErrorException('Failed to generate AI response.');
    }
  }

  // ─── Workout Recommendation ────────────────────────────────────────────────

  async recommendWorkout(userId: string, dto: WorkoutRecommendDto) {
    this.ensureConfigured();
    const user = await this.getUserProfile(userId);

    let ragContext = '';
    try {
      const query = `${dto.fitnessGoal} ${dto.difficulty} workout exercises`;
      ragContext = await this.ragService.getContext(query, { category: 'EXERCISE', topK: 5 });
    } catch (error) {
      console.warn('RAG context retrieval failed (non-blocking):', error);
    }

    const systemPrompt = `You are an expert personal trainer. Generate a personalized workout plan.
Return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "planName": "string",
  "weeklyFrequency": number,
  "sessionDuration": "string (e.g. 45-60 minutes)",
  "intensityLevel": "string",
  "schedule": [
    {
      "day": "string (e.g. Monday)",
      "focus": "string (e.g. Upper Body Push)",
      "exercises": [
        { "name": "string", "sets": number, "reps": "string", "rest": "string" }
      ]
    }
  ],
  "progressionStrategy": "string",
  "recoveryProtocol": "string",
  "confidenceScore": number (0-1)
}

${this.formatUserContext(user)}

CRITICAL SAFETY CONSTRAINT: Review the user's "Medical Conditions / Injuries". If it is anything other than "None reported", YOU MUST strictly avoid recommending exercises that could exacerbate their condition. Provide safe alternatives and prioritize their physical limitations over generic goal progression. Do not ignore this.

Workout Requirements:
- Fitness Goal: ${dto.fitnessGoal.replace('_', ' ')}
- Activity Level: ${dto.activityLevel.replace('_', ' ')}
- Difficulty: ${dto.difficulty}
${dto.age ? `- Age: ${dto.age}` : ''}
${dto.healthNotes ? `- Health Notes: ${dto.healthNotes}` : ''}
${ragContext}`;

    try {
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Generate a personalized workout plan based on my profile and requirements.' }] }],
        config: { systemInstruction: systemPrompt, temperature: 0.5 },
      });

      const parsed = this.parseJsonResponse(response.text || '');

      return {
        data: {
          userId,
          input: dto,
          recommendation: parsed,
          generatedAt: new Date().toISOString(),
        },
        message: 'Workout recommendation generated',
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse workout recommendation JSON:', error);
        throw new InternalServerErrorException('AI returned an invalid response. Please try again.');
      }
      console.error('Workout recommendation error:', error);
      throw new InternalServerErrorException('Failed to generate workout recommendation.');
    }
  }

  // ─── Meal Recommendation ───────────────────────────────────────────────────

  async recommendMeal(userId: string, dto: MealRecommendDto) {
    this.ensureConfigured();
    const user = await this.getUserProfile(userId);

    const targetCalories = dto.targetCalories || 2000;

    let ragContext = '';
    try {
      const query = `${dto.fitnessGoal} ${dto.dietPreference || ''} nutrition meal plan`;
      ragContext = await this.ragService.getContext(query, { category: 'NUTRITION', topK: 5 });
    } catch (error) {
      console.warn('RAG context retrieval failed (non-blocking):', error);
    }

    // Also get health guidelines for macro ratios
    let healthContext = '';
    try {
      healthContext = await this.ragService.getContext(`macro ratios ${dto.fitnessGoal}`, { category: 'HEALTH', topK: 3 });
    } catch (error) { /* non-blocking */ }

    const systemPrompt = `You are an expert sports nutritionist. Generate a personalized meal plan.
Return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "planName": "string",
  "dailyCalories": number,
  "macroTargets": { "protein": number, "carbs": number, "fat": number },
  "mealFrequency": number,
  "meals": [
    {
      "name": "string (e.g. Breakfast)",
      "time": "string (e.g. 7:00 AM)",
      "foods": [
        { "item": "string", "portion": "string", "calories": number, "protein": number, "carbs": number, "fat": number }
      ],
      "totalCalories": number
    }
  ],
  "hydrationTarget": "string",
  "supplements": ["string"],
  "avoidFoods": ["string"],
  "confidenceScore": number (0-1)
}

${this.formatUserContext(user)}

Meal Plan Requirements:
- Fitness Goal: ${dto.fitnessGoal.replace('_', ' ')}
- Target Calories: ${targetCalories} kcal/day
- Diet Preference: ${dto.dietPreference || 'No restriction'}
${dto.allergies ? `- Allergies: ${dto.allergies}` : ''}
${ragContext}
${healthContext}`;

    try {
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Generate a personalized meal plan based on my profile and requirements.' }] }],
        config: { systemInstruction: systemPrompt, temperature: 0.5 },
      });

      const parsed = this.parseJsonResponse(response.text || '');

      return {
        data: {
          userId,
          input: dto,
          recommendation: parsed,
          generatedAt: new Date().toISOString(),
        },
        message: 'Meal recommendation generated',
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse meal recommendation JSON:', error);
        throw new InternalServerErrorException('AI returned an invalid response. Please try again.');
      }
      console.error('Meal recommendation error:', error);
      throw new InternalServerErrorException('Failed to generate meal recommendation.');
    }
  }

  // ─── Pose Analysis ─────────────────────────────────────────────────────────

  async analyzePose(userId: string, dto: PoseAnalyzeDto) {
    this.ensureConfigured();

    let ragContext = '';
    try {
      ragContext = await this.ragService.getContext(dto.exerciseType, { category: 'EXERCISE', topK: 3 });
    } catch (error) {
      console.warn('RAG context retrieval failed (non-blocking):', error);
    }

    const systemPrompt = `You are an expert exercise form analyst and personal trainer.
Analyze the exercise form from the provided image/frame data and return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "formScore": number (0-100),
  "feedback": "string (overall assessment)",
  "detectedMistakes": ["string"],
  "suggestions": ["string"],
  "musclesEngaged": ["string"],
  "safetyWarnings": ["string (only if serious form issues)"],
  "confidenceScore": number (0-1)
}

Exercise being performed: ${dto.exerciseType}
${dto.notes ? `Additional context: ${dto.notes}` : ''}
${ragContext}`;

    try {
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: dto.videoFrameData } },
              { text: `Analyze the form for this ${dto.exerciseType} exercise and provide detailed feedback.` },
            ],
          },
        ],
        config: { systemInstruction: systemPrompt, temperature: 0.3 },
      });

      const parsed = this.parseJsonResponse(response.text || '');

      return {
        data: {
          userId,
          exerciseType: dto.exerciseType,
          analysisId: `pose_${Date.now()}`,
          formScore: Number(parsed.formScore) || 0,
          feedback: parsed.feedback || '',
          detectedMistakes: Array.isArray(parsed.detectedMistakes) ? parsed.detectedMistakes : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          musclesEngaged: Array.isArray(parsed.musclesEngaged) ? parsed.musclesEngaged : [],
          safetyWarnings: Array.isArray(parsed.safetyWarnings) ? parsed.safetyWarnings : [],
          confidenceScore: Number(parsed.confidenceScore) || 0.5,
          timestamp: new Date().toISOString(),
        },
        message: 'Pose analysis complete',
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse pose analysis JSON:', error);
        throw new InternalServerErrorException('AI returned an invalid response. Please try again.');
      }
      console.error('Pose analysis error:', error);
      throw new InternalServerErrorException('Failed to analyze exercise form.');
    }
  }

  async analyzeFood(
    userId: string,
    imageBuffer: Buffer,
    mimeType: string,
    hints?: { mealName?: string; ingredients?: string; servingSize?: string },
  ) {
    if (!this.genai) {
      throw new InternalServerErrorException('AI Service is not configured. Set GEMINI_API_KEY in .env');
    }

    const systemPrompt = `You are a professional nutritionist and food recognition AI.
Analyze the food in this image and return ONLY a valid JSON object (no markdown, no code fences) with exactly this structure:
{
  "foodName": "Name of the dish/meal",
  "detectedIngredients": ["ingredient1", "ingredient2", ...],
  "estimatedCalories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "confidenceScore": <number between 0 and 1>
}

Guidelines:
- Estimate a realistic single serving portion size
- Be specific about the food name (e.g. "Grilled Chicken Caesar Salad" not just "Salad")
- List all visible and likely ingredients
- Provide your best calorie and macro estimates based on typical recipes
- Set confidenceScore lower (0.5-0.7) for complex/mixed dishes, higher (0.8-0.95) for clearly identifiable foods
- Return ONLY the JSON object, nothing else`;

    try {
      const imageBase64 = imageBuffer.toString('base64');

      // Retrieve relevant nutrition data via RAG
      let ragContext = '';
      if (hints?.mealName || hints?.ingredients) {
        const ragQuery = [hints.mealName, hints.ingredients].filter(Boolean).join(' ');
        try {
          ragContext = await this.ragService.getContext(ragQuery, {
            category: 'NUTRITION',
            topK: 3,
          });
        } catch (error) {
          console.warn('RAG nutrition lookup failed (non-blocking):', error);
        }
      }

      const fullSystemPrompt = ragContext
        ? `${systemPrompt}\n\n${ragContext}\nUse the above reference data to cross-check and improve the accuracy of your calorie and macronutrient estimates.`
        : systemPrompt;

      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              {
                text: this.buildFoodAnalysisPrompt(hints),
              },
            ],
          },
        ],
        config: {
          systemInstruction: fullSystemPrompt,
          temperature: 0.3,
        },
      });

      const rawText = response.text || '';
      
      // Clean up potential markdown code fences
      const cleanedText = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleanedText);

      return {
        data: {
          userId,
          analysisId: `food_${Date.now()}`,
          foodName: parsed.foodName || 'Unknown Food',
          estimatedCalories: Number(parsed.estimatedCalories) || 0,
          protein: Number(parsed.protein) || 0,
          carbs: Number(parsed.carbs) || 0,
          fat: Number(parsed.fat) || 0,
          confidenceScore: Number(parsed.confidenceScore) || 0.5,
          detectedIngredients: Array.isArray(parsed.detectedIngredients)
            ? parsed.detectedIngredients
            : [],
          timestamp: new Date().toISOString(),
        },
        message: 'Food analysis complete',
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse Gemini response as JSON:', error);
        throw new InternalServerErrorException('AI returned an invalid response. Please try again.');
      }
      console.error('Food analysis error:', error);
      throw new InternalServerErrorException('Failed to analyze food image.');
    }
  }

  private buildFoodAnalysisPrompt(hints?: { mealName?: string; ingredients?: string; servingSize?: string }): string {
    let prompt = 'Analyze this food image and estimate the nutritional content.';

    if (hints?.mealName || hints?.ingredients || hints?.servingSize) {
      prompt += '\n\nThe user has provided the following additional context to help with your analysis:';
      if (hints.mealName) {
        prompt += `\n- Meal name: "${hints.mealName}"`;
      }
      if (hints.ingredients) {
        prompt += `\n- Ingredients: ${hints.ingredients}`;
      }
      if (hints.servingSize) {
        prompt += `\n- Serving size: ${hints.servingSize}`;
      }
      prompt += '\n\nUse this information along with the image to provide a more accurate estimation.';
    }

    return prompt;
  }
}
