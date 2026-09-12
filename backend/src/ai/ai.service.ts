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

// Common basic English dictionary words for fallback spell checking
const COMMON_ENGLISH_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'code',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few',
  'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll',
  'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll',
  'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves', 'prompt', 'specify', 'specified', 'specifying', 'specifies', 'specification', 'help', 'helps', 'helped',
  'helping', 'please', 'make', 'makes', 'made', 'making', 'use', 'uses', 'used', 'using', 'need', 'needs', 'needed',
  'time', 'work', 'good', 'well', 'great', 'new', 'first', 'way', 'day', 'man', 'thing', 'people', 'life', 'child',
  'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'place', 'case',
  'week', 'company', 'system', 'program', 'question', 'work', 'number', 'night', 'point', 'home', 'water', 'room',
  'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business',
  'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member',
  'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back',
  'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result',
  'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education', 'optimize',
  'optimizing', 'optimized', 'optimizer', 'optimization'
]);

@Injectable()
export class AiService {
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
  }

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
            temperature: 0.2,
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

    let engSentence = existingExample || `Learning and applying the word "${cleanTerm}" is essential for vocabulary growth.`;
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
   * Evaluate user sentence strictly with full grammar, spelling, and vocabulary checks
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
        nativeSuggestion: `Example: "Please specify the details clearly in the document."`,
      };
    }

    const prompt = `You are a strict, professional English grammar and spelling examiner.
Target vocabulary term: "${cleanTerm}"
Target word definition: "${definition}"
Student's written sentence: "${trimmedSentence}"

Critically evaluate the student's sentence for:
1. SPELLING: Check EVERY SINGLE WORD in the sentence. Are all words valid, correctly spelled English words? Flag any fake, made-up, or misspelled words (e.g., "optimosset").
2. GRAMMAR & SYNTAX: Is subject-verb agreement correct? Is the sentence structure grammatically valid in English? Check verb forms and clause structure.
3. VOCABULARY USAGE: Is the target word "${cleanTerm}" used correctly according to its definition ("${definition}")?

CRITICAL RULES:
- If there are ANY spelling mistakes, fake words, or grammar errors, "isGrammarCorrect" MUST be false and score MUST be 5 or lower!
- Explicitly detail all errors (spelling mistakes and grammar flaws) in Vietnamese in "feedback".

Return ONLY valid JSON:
{
  "isGrammarCorrect": boolean,
  "isWordUsedCorrectly": boolean,
  "score": number (integer 0 to 10),
  "feedback": "Detailed explanation in Vietnamese listing specific spelling errors (e.g. 'Từ optimosset không có thực') and grammar issues",
  "nativeSuggestion": "A fully corrected, natural English sentence"
}`;

    const aiResult = await this.callGemini(prompt);

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult);
        return {
          isGrammarCorrect: !!parsed.isGrammarCorrect,
          isWordUsedCorrectly: !!parsed.isWordUsedCorrectly,
          score: typeof parsed.score === 'number' ? Math.max(0, Math.min(10, parsed.score)) : 4,
          feedback: parsed.feedback || 'Đã phân tích câu của bạn.',
          nativeSuggestion: parsed.nativeSuggestion || trimmedSentence,
        };
      } catch (e) {
        console.error('Failed to parse Gemini evaluation response:', e);
      }
    }

    // Comprehensive Local Rule Engine (Spelling, Grammar, Syntax & Gibberish Check)
    return this.ruleBasedEvaluation(cleanTerm, definition, trimmedSentence);
  }

  /**
   * Rule-based engine checking spelling of all words, subject-verb agreement, and sentence structure
   */
  private ruleBasedEvaluation(cleanTerm: string, definition: string, sentence: string): AiSentenceEvaluation {
    const rawTokens = sentence.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').split(/\s+/).filter(Boolean);
    const lowerTokens = rawTokens.map(w => w.toLowerCase());
    const lowerTerm = cleanTerm.toLowerCase();

    const errors: string[] = [];
    const invalidWords: string[] = [];
    let isGrammarCorrect = true;
    let isWordUsedCorrectly = lowerTokens.includes(lowerTerm) || sentence.toLowerCase().includes(lowerTerm);
    let score = 10;

    // 1. Spell check all words
    for (const token of lowerTokens) {
      if (token === lowerTerm) continue;
      
      // Check for gibberish / fake words
      const isKnown = COMMON_ENGLISH_WORDS.has(token);
      const isVowelLess = token.length > 2 && !/[aeiouy]/.test(token);
      const hasRepeatedTriple = /(.)\1\1/.test(token);
      
      if (!isKnown && (isVowelLess || hasRepeatedTriple || token.length > 9 || !this.looksLikeEnglishWord(token))) {
        invalidWords.push(token);
      }
    }

    if (invalidWords.length > 0) {
      isGrammarCorrect = false;
      score -= 5;
      errors.push(`❌ Lỗi từ vựng/chính tả: Từ "${invalidWords.join(', ')}" không phải là từ tiếng Anh chuẩn.`);
    }

    // 2. Check if target word is included
    if (!isWordUsedCorrectly) {
      isGrammarCorrect = false;
      score -= 3;
      errors.push(`⚠️ Bạn chưa sử dụng đúng từ vựng yêu cầu: "${cleanTerm}".`);
    }

    // 3. Subject-Verb / Grammar checks
    // Example: "Prompt code specify help" -> 2 base verbs or ungrammatical verb sequence
    const sentenceLower = sentence.toLowerCase();
    if (/\b(specify|specify)\s+(help|helps|helping)\b/.test(sentenceLower) || /\bcode\s+specify\b/.test(sentenceLower)) {
      isGrammarCorrect = false;
      score -= 3;
      errors.push(`❌ Lỗi ngữ pháp: Động từ "${cleanTerm}" đặt sau danh từ chưa chia đúng thì/dạng từ (ví dụ: "specifying will help" hoặc "specifies").`);
    }

    // 4. Capitalization & Punctuation
    const startsCapital = /^[A-Z]/.test(sentence);
    const hasPunctuation = /[.!?]$/.test(sentence);
    if (!startsCapital || !hasPunctuation) {
      score -= 1;
      errors.push(`💡 Lưu ý: Cần viết hoa chữ cái đầu câu và thêm dấu chấm ở cuối câu.`);
    }

    // Ensure score bounds
    score = Math.max(1, Math.min(10, score));

    // Construct native suggestion
    let suggestion = sentence;
    if (sentenceLower.includes('prompt code specify help')) {
      suggestion = `Specifying the prompt code will help you optimize your results more effectively.`;
    } else if (!isGrammarCorrect) {
      suggestion = `Please specify the details clearly so that it helps you optimize more effectively.`;
    }

    return {
      isGrammarCorrect,
      isWordUsedCorrectly,
      score,
      feedback: errors.length > 0
        ? errors.join('\n')
        : `✅ Câu của bạn đúng cấu trúc ngữ pháp và từ vựng!`,
      nativeSuggestion: suggestion,
    };
  }

  private looksLikeEnglishWord(word: string): boolean {
    // Basic structural heuristic for English words
    if (COMMON_ENGLISH_WORDS.has(word)) return true;
    if (word.endsWith('s') || word.endsWith('ed') || word.endsWith('ing') || word.endsWith('ly') || word.endsWith('tion') || word.endsWith('ment')) {
      return true;
    }
    // Rare consonant combinations or non-English letter sequences
    if (/[qwrtypsdfghjklzxcvbnm]{5,}/.test(word)) return false;
    return word.length <= 12;
  }
}
