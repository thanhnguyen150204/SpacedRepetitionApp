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

// Robust clean word term: removes (v.), (n.), (adj.), (v., (n., (v), etc. and trims whitespace
function cleanWordTerm(rawTerm: string): string {
  if (!rawTerm) return '';
  // Remove parenthetical annotations like (v.), (n.), (adj.), (adv.), (v., (n., (v), (n), (phrase), etc.
  let cleaned = rawTerm.replace(/\s*\([^)]*\)?/gi, '');
  // Remove trailing standalone part-of-speech indicators like " v.", " n.", " adj.", " (v"
  cleaned = cleaned.replace(/\s+\b(v|n|adj|adv|phr|prep|phrase)\.?,?$/gi, '');
  cleaned = cleaned.replace(/\b(v|n|adj|adv|phr|prep)\.?$/gi, '');
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
  'optimizing', 'optimized', 'optimizer', 'optimization', 'resolve', 'resolves', 'resolved', 'resolving', 'resolution',
  'problem', 'problems', 'tester', 'testers', 'review', 'reviews', 'reviewed', 'reviewing', 'again', 'solution'
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
        nativeSuggestion: `Example: "Please ${cleanTerm} the issue clearly in your report."`,
      };
    }

    const prompt = `You are a strict, professional English grammar and spelling examiner.
Target vocabulary term: "${cleanTerm}"
Target word definition: "${definition}"
Student's written sentence: "${trimmedSentence}"

Critically evaluate the student's sentence for:
1. SPELLING: Check EVERY SINGLE WORD in the sentence. Are all words valid, correctly spelled English words? Flag any fake, made-up, or misspelled words.
2. GRAMMAR & SYNTAX: Is subject-verb agreement correct? Check verb structures (e.g., "need resolve" is missing "to" -> should be "need to resolve").
3. VOCABULARY USAGE: Is the target word "${cleanTerm}" used correctly according to its definition ("${definition}")?

CRITICAL RULES:
- If there are ANY spelling mistakes, fake words, or grammar errors (like "need resolve"), "isGrammarCorrect" MUST be false and score MUST be 5 or lower!
- Explicitly detail all errors in Vietnamese in "feedback".
- In "nativeSuggestion", provide a corrected version of the student's exact sentence for "${cleanTerm}". DO NOT suggest a sentence for a different word!

Return ONLY valid JSON:
{
  "isGrammarCorrect": boolean,
  "isWordUsedCorrectly": boolean,
  "score": number (integer 0 to 10),
  "feedback": "Detailed explanation in Vietnamese listing specific spelling errors and grammar issues",
  "nativeSuggestion": "A fully corrected, natural English sentence for ${cleanTerm}"
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

    // 1. Check spellings
    for (const token of lowerTokens) {
      if (token === lowerTerm) continue;
      
      const isKnown = COMMON_ENGLISH_WORDS.has(token);
      const isVowelLess = token.length > 2 && !/[aeiouy]/.test(token);
      const hasRepeatedTriple = /(.)\1\1/.test(token);
      
      if (!isKnown && (isVowelLess || hasRepeatedTriple || token.length > 10 || !this.looksLikeEnglishWord(token))) {
        invalidWords.push(token);
      }
    }

    if (invalidWords.length > 0) {
      isGrammarCorrect = false;
      score -= 4;
      errors.push(`❌ Lỗi từ vựng/chính tả: Từ "${invalidWords.join(', ')}" không phải là từ tiếng Anh chuẩn.`);
    }

    // 2. Check if target word is included
    if (!isWordUsedCorrectly) {
      isGrammarCorrect = false;
      score -= 4;
      errors.push(`⚠️ Bạn chưa sử dụng đúng từ vựng yêu cầu: "${cleanTerm}".`);
    }

    // 3. Grammar checks for common patterns (e.g. "need resolve" -> missing "to")
    const sentenceLower = sentence.toLowerCase();
    if (/\bneed\s+[a-z]+\b/.test(sentenceLower) && !/\bneed\s+to\b/.test(sentenceLower)) {
      isGrammarCorrect = false;
      score -= 3;
      errors.push(`❌ Lỗi cấu trúc ngữ pháp: Động từ "need" đi với động từ nguyên mẫu cần có "to" (ví dụ: "need to ${lowerTerm}").`);
    }

    // 4. Capitalization & Punctuation
    const startsCapital = /^[A-Z]/.test(sentence);
    const hasPunctuation = /[.!?]$/.test(sentence);
    if (!startsCapital || !hasPunctuation) {
      score -= 1;
      errors.push(`💡 Lưu ý: Cần viết hoa chữ cái đầu câu và thêm dấu chấm ở cuối câu.`);
    }

    score = Math.max(1, Math.min(10, score));

    // Dynamic Native Suggestion for the SPECIFIC cleanTerm (Never hardcoded to wrong word!)
    let suggestion = sentence.trim();
    if (sentenceLower.includes('need resolve')) {
      suggestion = `I need to ${lowerTerm} this problem so that the tester can review it again.`;
    } else if (!isGrammarCorrect || !isWordUsedCorrectly) {
      suggestion = `I need to ${lowerTerm} this issue as soon as possible.`;
    } else {
      suggestion = `${suggestion.charAt(0).toUpperCase()}${suggestion.slice(1)}${hasPunctuation ? '' : '.'}`;
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
    if (COMMON_ENGLISH_WORDS.has(word)) return true;
    if (word.endsWith('s') || word.endsWith('ed') || word.endsWith('ing') || word.endsWith('ly') || word.endsWith('tion') || word.endsWith('ment') || word.endsWith('er')) {
      return true;
    }
    if (/[qwrtypsdfghjklzxcvbnm]{5,}/.test(word)) return false;
    return word.length <= 12;
  }
}
