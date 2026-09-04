import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';

@Injectable()
export class OcrService {
  /** Extract text from image or PDF buffer */
  async extractText(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.pdf') {
      return this.extractFromPdf(file.buffer);
    } else {
      return this.extractFromImage(file.buffer, ext);
    }
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractFromImage(buffer: Buffer, ext: string): Promise<string> {
    const Tesseract = require('tesseract.js');
    const tmpPath = path.join(process.cwd(), 'uploads', `tmp_${Date.now()}${ext}`);

    // Ensure uploads dir exists
    if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), 'uploads'));
    }

    fs.writeFileSync(tmpPath, buffer);
    try {
      const { data: { text } } = await Tesseract.recognize(tmpPath, 'eng+vie', {
        logger: () => {},
      });
      return text;
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }

  /** Parse extracted text into word-definition pairs */
  parseWordPairs(rawText: string): Array<{ term: string; definition: string; phonetic?: string }> {
    // 0. Clean speaker icons, emojis, control symbols, and box drawing characters
    const cleanText = rawText
      .replace(/[\uD800-\uDFFF\uFFF0-\uFFFF\u2500-\u2BFF\u2600-\u27BF\u2000-\u206F]/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ');

    const lines = cleanText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const pairs: Array<{ term: string; definition: string; phonetic?: string }> = [];

    const isHeader = (str: string) => {
      const lower = str.toLowerCase();
      return (
        lower.includes('từ vựng') ||
        lower.includes('dịch nghĩa') ||
        lower.includes('stt') ||
        lower === 'term' ||
        lower === 'definition' ||
        lower === 'meaning'
      );
    };

    const isEnglishTerm = (str: string) => {
      const s = str.trim();
      if (s.length === 0 || s.length > 80 || isHeader(s)) return false;
      // Matches English words/phrases, including POS brackets e.g. "avoid (v)", "address (n, v)"
      return /^[a-zA-Z0-9\s\-\'\,\.\/\(\)]+$/.test(s);
    };

    const hasVietnamese = (str: string) => {
      return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(str);
    };

    // Strategy 1: Try single-line matching ("word - definition", "word: definition", "word | definition", tabs)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isHeader(line)) continue;

      const parts = line.split(/\s*[-:|]\s*|\s{2,}|\t/).map((s) => s.trim()).filter((s) => s.length > 0);
      if (parts.length >= 2 && isEnglishTerm(parts[0]) && hasVietnamese(parts.slice(1).join(' '))) {
        pairs.push({ term: parts[0], definition: parts.slice(1).join(' — ') });
      }
    }

    if (pairs.length > 0) return pairs;

    // Strategy 2: Google Docs / Word table PDF multi-line sequential extraction
    // Google Docs PDF text stream extracts cell 1 (English), then cell 2 (Vietnamese lines)
    let currentTerm: string | null = null;
    let currentDefLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isHeader(line)) continue;

      if (isEnglishTerm(line) && !hasVietnamese(line)) {
        if (currentTerm && currentDefLines.length > 0) {
          pairs.push({ term: currentTerm, definition: currentDefLines.join(', ') });
        }
        currentTerm = line;
        currentDefLines = [];
      } else if (currentTerm && hasVietnamese(line)) {
        currentDefLines.push(line);
      }
    }

    if (currentTerm && currentDefLines.length > 0) {
      pairs.push({ term: currentTerm, definition: currentDefLines.join(', ') });
    }

    return pairs;
  }
}
