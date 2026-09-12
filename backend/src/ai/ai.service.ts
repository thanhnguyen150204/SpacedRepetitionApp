import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiGeneratedSentence {
  englishSentence: string;
  vietnameseTranslation: string;
  blankedSentence: string;
  hint: string;
}

export interface AiSentenceEvaluation {
  isGrammarCorrect: boolean;
  isWordUsedCorrectly: boolean;
  score: number; // 0 - 10
  feedback: string;
  nativeSuggestion: string;
}

function cleanWordTerm(rawTerm: string): string {
  if (!rawTerm) return '';
  let cleaned = rawTerm.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.trim();
  return cleaned || rawTerm.trim();
}

@Injectable()
export class AiService {
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Call Gemini 1.5 Flash REST API endpoint
   */
  private async callGemini(prompt: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          }
        }),
      });

      if (!response.ok) {
        console.warn('Gemini API call returned non-200 status:', response.status);
        return null;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || null;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return null;
    }
  }

  /**
   * Generate an English example sentence & practice question for a word card
   */
  async generateSentencePractice(
    term: string,
    definition: string,
    partOfSpeech?: string,
    existingExample?: string,
  ): Promise<AiGeneratedSentence> {
    const cleanTerm = cleanWordTerm(term);

    const prompt = `You are an expert English language tutor. 
Vocabulary term: "${cleanTerm}"
Meaning: "${definition}"
${partOfSpeech ? `Part of speech: ${partOfSpeech}` : ''}

Generate a clear, natural English example sentence for this term suitable for learning.
Return ONLY valid JSON matching this exact structure:
{
  "englishSentence": "Complete natural English example sentence containing the word",
  "vietnameseTranslation": "Accurate Vietnamese translation of the example sentence",
  "blankedSentence": "The exact English sentence with '${cleanTerm}' replaced by '_______'",
  "hint": "Brief usage tip or collocations in Vietnamese"
}`;

    const aiResult = await this.callGemini(prompt);

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult);
        if (parsed.englishSentence && parsed.blankedSentence) {
          return {
            englishSentence: parsed.englishSentence,
            vietnameseTranslation: parsed.vietnameseTranslation || '',
            blankedSentence: parsed.blankedSentence,
            hint: parsed.hint || `Dùng từ "${cleanTerm}" trong ngữ cảnh này.`,
          };
        }
      } catch (e) {
        console.error('Failed to parse Gemini response for generateSentencePractice:', e);
      }
    }

    // Smart Fallback when Gemini API key is not present or offline
    let engSentence = existingExample || `Learning and applying the word "${cleanTerm}" is essential for vocabulary growth.`;
    
    // Mask term in existing example
    const regex = new RegExp(cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let blanked = engSentence.replace(regex, '_______');

    if (blanked === engSentence) {
      engSentence = `Her ${cleanTerm} impressed everyone in the team.`;
      blanked = `Her _______ impressed everyone in the team.`;
    }

    return {
      englishSentence: engSentence,
      vietnameseTranslation: `Việc áp dụng từ "${cleanTerm}" (${definition}) giúp bạn giao tiếp tự nhiên hơn.`,
      blankedSentence: blanked,
      hint: `Điền từ vựng thích hợp có nghĩa: ${definition}`,
    };
  }

  /**
   * Evaluate a custom sentence written by the user using Gemini AI Writing Coach
   */
  async evaluateSentence(
    term: string,
    definition: string,
    userSentence: string,
  ): Promise<AiSentenceEvaluation> {
    const cleanTerm = cleanWordTerm(term);
    const trimmedSentence = userSentence.trim();

    if (!trimmedSentence) {
      return {
        isGrammarCorrect: false,
        isWordUsedCorrectly: false,
        score: 0,
        feedback: 'Bạn chưa nhập câu nào. Hãy thử viết một câu tiếng Anh!',
        nativeSuggestion: `Example: "Using ${cleanTerm} correctly makes your English sound natural."`,
      };
    }

    const prompt = `You are a friendly, encouraging English grammar teacher.
Target vocabulary term: "${cleanTerm}"
Target word definition: "${definition}"
Student's written sentence: "${trimmedSentence}"

Evaluate the student's sentence carefully.
Return ONLY valid JSON matching this exact structure:
{
  "isGrammarCorrect": boolean,
  "isWordUsedCorrectly": boolean,
  "score": number (integer between 0 and 10),
  "feedback": "Detailed helpful feedback in Vietnamese explaining grammar, word usage, and spelling",
  "nativeSuggestion": "A natural, native-sounding rewrite of the student's sentence"
}`;

    const aiResult = await this.callGemini(prompt);

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult);
        return {
          isGrammarCorrect: !!parsed.isGrammarCorrect,
          isWordUsedCorrectly: !!parsed.isWordUsedCorrectly,
          score: typeof parsed.score === 'number' ? parsed.score : 7,
          feedback: parsed.feedback || 'Câu của bạn được xây dựng tốt!',
          nativeSuggestion: parsed.nativeSuggestion || trimmedSentence,
        };
      } catch (e) {
        console.error('Failed to parse Gemini evaluation response:', e);
      }
    }

    // Heuristic Fallback when Gemini API key is not present
    const containsWord = trimmedSentence.toLowerCase().includes(cleanTerm.toLowerCase());
    const startsCapital = /^[A-Z]/.test(trimmedSentence);
    const hasPunctuation = /[.!?]$/.test(trimmedSentence);
    const wordCount = trimmedSentence.split(/\s+/).length;

    let score = 5;
    const notes: string[] = [];

    if (containsWord) {
      score += 3;
      notes.push(`✅ Đã sử dụng đúng từ vựng "${cleanTerm}".`);
    } else {
      notes.push(`⚠️ Câu của bạn chưa chứa từ vựng yêu cầu: "${cleanTerm}".`);
    }

    if (wordCount >= 4) {
      score += 1;
    } else {
      notes.push('💡 Hãy mở rộng câu dài hơn một chút để diễn đạt rõ ý.');
    }

    if (startsCapital && hasPunctuation) {
      score += 1;
      notes.push('✅ Viết hoa đầu câu và có dấu chấm câu chuẩn.');
    } else {
      notes.push('💡 Lưu ý viết hoa đầu câu và thêm dấu chấm cuối câu.');
    }

    return {
      isGrammarCorrect: score >= 7,
      isWordUsedCorrectly: containsWord,
      score: Math.min(10, score),
      feedback: notes.join('\n'),
      nativeSuggestion: containsWord
        ? `${trimmedSentence.charAt(0).toUpperCase() + trimmedSentence.slice(1)}${hasPunctuation ? '' : '.'}`
        : `She demonstrated great ${cleanTerm} to overcome all obstacles.`,
    };
  }
}
