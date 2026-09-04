import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionType } from '../entities/question.entity';
import { VocabularyCard } from '../entities/vocabulary-card.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    @InjectRepository(VocabularyCard)
    private cardRepo: Repository<VocabularyCard>,
  ) {}

  async generateForDeck(deckId: string): Promise<Question[]> {
    const cards = await this.cardRepo.find({ where: { deckId } });
    if (cards.length < 2) return [];

    // Delete old generated questions for this deck
    const cardIds = cards.map((c) => c.id);
    await this.questionRepo
      .createQueryBuilder()
      .delete()
      .where('card_id IN (:...ids)', { ids: cardIds })
      .execute();

    const questions: Question[] = [];

    for (const card of cards) {
      const otherCards = cards.filter((c) => c.id !== card.id);
      const distractors = this.pickRandom(otherCards, 3).map((c) => c.definition);

      // Multiple choice: what is the definition of this term?
      const mcq = this.questionRepo.create({
        cardId: card.id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        questionText: `What is the meaning of "${card.term}"?`,
        correctAnswer: card.definition,
        distractors,
        difficulty: 2,
      });
      questions.push(mcq);

      // Reverse MCQ: which term matches this definition?
      const termDistractors = this.pickRandom(otherCards, 3).map((c) => c.term);
      const reverseMcq = this.questionRepo.create({
        cardId: card.id,
        questionType: QuestionType.MULTIPLE_CHOICE,
        questionText: `Which word means: "${card.definition}"?`,
        correctAnswer: card.term,
        distractors: termDistractors,
        difficulty: 2,
      });
      questions.push(reverseMcq);

      // Fill in the blank (if example sentence exists)
      if (card.exampleSentence) {
        const blank = card.exampleSentence.replace(
          new RegExp(card.term, 'gi'),
          '_____',
        );
        if (blank !== card.exampleSentence) {
          const fill = this.questionRepo.create({
            cardId: card.id,
            questionType: QuestionType.FILL_BLANK,
            questionText: `Fill in the blank: "${blank}"`,
            correctAnswer: card.term,
            distractors: termDistractors,
            difficulty: 3,
          });
          questions.push(fill);
        }
      }
    }

    return this.questionRepo.save(questions);
  }

  async getForDeck(deckId: string, limit = 20): Promise<Question[]> {
    const cards = await this.cardRepo.find({ where: { deckId } });
    const cardIds = cards.map((c) => c.id);
    if (!cardIds.length) return [];

    return this.questionRepo
      .createQueryBuilder('q')
      .innerJoinAndSelect('q.card', 'card')
      .where('q.card_id IN (:...ids)', { ids: cardIds })
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();
  }

  private pickRandom<T>(arr: T[], n: number): T[] {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
  }
}
