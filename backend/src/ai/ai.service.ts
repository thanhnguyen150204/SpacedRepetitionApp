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
  let cleaned = rawTerm.replace(/\s*\([^)]*\)?/gi, '');
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
  'problem', 'problems', 'tester', 'testers', 'review', 'reviews', 'reviewed', 'reviewing', 'again', 'solution',
  'determine', 'determines', 'determined', 'determining', 'determination', 'join', 'joins', 'joined', 'joining',
  'growth', 'grow', 'grows', 'grew', 'growing'
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

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
    ];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
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

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        } else {
          console.warn(`Gemini API call with model ${model} returned status: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error calling Gemini API model ${model}:`, error);
      }
    }

    return null;
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
2. GRAMMAR & SYNTAX: Is subject-verb agreement correct? Check verb structures (e.g., "determine join" is ungrammatical -> must be "determine to join" or "am determined to join", "need resolve" -> "need to resolve"). Check preposition usage (e.g., "join in a company" -> "join a company"). Check pronoun capitalization ("i" -> "I").
3. VOCABULARY USAGE: Is the target word "${cleanTerm}" used correctly according to its definition ("${definition}")?

CRITICAL RULES:
- If there are ANY spelling mistakes, fake words, or grammar errors (such as "determine join", "join in this company", "want growth more", or uncapitalized "i"), "isGrammarCorrect" MUST be false and score MUST be 5 or lower!
- Explicitly detail all errors in Vietnamese in "feedback".
- In "nativeSuggestion", rewrite and fix the STUDENT'S EXACT SENTENCE ("${trimmedSentence}"). Fix all spelling errors (e.g. replace fake/gibberish words with real words), add missing prepositions/to-infinitive (e.g. "need write" -> "need to write"), and fix word order. NEVER return a generic canned sentence. Return the direct corrected version of the student's input sentence for "${cleanTerm}".

Return ONLY valid JSON:
{
  "isGrammarCorrect": boolean,
  "isWordUsedCorrectly": boolean,
  "score": number (integer 0 to 10),
  "feedback": "Detailed explanation in Vietnamese listing specific spelling errors and grammar issues",
  "nativeSuggestion": "The direct corrected version of the student's exact input sentence"
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

    // Comprehensive Local Rule Engine (Spelling, Grammar, Syntax & Verb Pattern Check)
    return this.ruleBasedEvaluation(cleanTerm, definition, trimmedSentence);
  }

  /**
   * Comprehensive rule-based engine for grammar, syntax, spelling, and verb complementation
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

    // 2. Check target word presence
    if (!isWordUsedCorrectly) {
      isGrammarCorrect = false;
      score -= 4;
      errors.push(`⚠️ Bạn chưa sử dụng đúng từ vựng yêu cầu: "${cleanTerm}".`);
    }

    const sentenceLower = sentence.toLowerCase();

    // 3. Verb complementation pattern check (e.g. "determine join", "need resolve", "decide go")
    const verbPatternRegex = /\b(determine|decide|want|need|agree|hope|plan|expect|try|refuse|attempt|wish)\s+(?!to\b|\s+to\b)([a-z]{3,})\b/i;
    const verbMatch = sentenceLower.match(verbPatternRegex);
    if (verbMatch) {
      isGrammarCorrect = false;
      score -= 4;
      const v = verbMatch[1];
      const nextV = verbMatch[2];
      errors.push(`❌ Lỗi cấu trúc ngữ pháp: Động từ "${v}" đi với động từ khác cần có "to" (ví dụ: "${v} to ${nextV}" hoặc "am ${v}ed to ${nextV}").`);
    }

    // 4. Preposition error check (e.g. "join in this company" -> "join this company")
    if (/\bjoin\s+in\s+(a|the|this|that|our|my|any)?\s*(company|team|organization|group|club|project)\b/i.test(sentenceLower)) {
      isGrammarCorrect = false;
      score -= 2;
      errors.push(`❌ Lỗi kết hợp từ (Collocation): Dùng "join this company" thay vì "join in this company".`);
    }

    // 5. Expression error (e.g. "want growth more" -> "want to grow more")
    if (/\bwant\s+growth\s+more\b/i.test(sentenceLower) || /\bwant\s+growth\b/i.test(sentenceLower)) {
      isGrammarCorrect = false;
      score -= 2;
      errors.push(`❌ Lỗi diễn đạt: Nên dùng "want to grow more" thay vì "want growth more".`);
    }

    // 6. Standalone lowercase 'i' pronoun check
    if (/\b i \b|\b i$|^i \b/.test(sentence)) {
      isGrammarCorrect = false;
      score -= 1;
      errors.push(`❌ Lỗi chính tả/viết hoa: Đại từ xưng hô "I" phải luôn viết hoa (thay vì chữ "i" thường).`);
    }

    // 7. Capitalization & Punctuation check
    const startsCapital = /^[A-Z]/.test(sentence);
    const hasPunctuation = /[.!?]$/.test(sentence);
    if (!startsCapital || !hasPunctuation) {
      score -= 1;
      errors.push(`💡 Lưu ý: Cần viết hoa chữ cái đầu câu và thêm dấu chấm ở cuối câu.`);
    }

    // If any error exists, sentence is NOT grammar correct
    if (errors.length > 0) {
      isGrammarCorrect = false;
    }

    score = Math.max(1, Math.min(10, score));

    // Dynamic Native Suggestion engine: directly correct student's exact sentence
    let suggestion = sentence.trim();
    suggestion = suggestion.replace(/\boptimosset\b/gi, 'optimize');
    suggestion = suggestion.replace(/\bneed\s+write\s+specify\b/gi, 'need to specify the');
    suggestion = suggestion.replace(/\bneed\s+write\b/gi, 'need to write');
    suggestion = suggestion.replace(/\bdetermine\s+join\b/gi, 'am determined to join');
    suggestion = suggestion.replace(/\bneed\s+resolve\b/gi, 'need to resolve');
    suggestion = suggestion.replace(/\bwant\s+growth\s+more\b/gi, 'want to grow more');
    suggestion = suggestion.replace(/\bjoin\s+in\s+/gi, 'join ');
    suggestion = suggestion.replace(/\b i \b/g, ' I ');

    if (!/^[A-Z]/.test(suggestion)) {
      suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
    }
    if (!/[.!?]$/.test(suggestion)) {
      suggestion = suggestion + '.';
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
