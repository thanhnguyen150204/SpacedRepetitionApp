import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { CardReview } from '../entities/card-review.entity';
import { ReviewLog } from '../entities/review-log.entity';
import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { calculateSM2 } from './sm2.algorithm';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(CardReview)
    private cardReviewRepo: Repository<CardReview>,
    @InjectRepository(ReviewLog)
    private reviewLogRepo: Repository<ReviewLog>,
    @InjectRepository(VocabularyCard)
    private cardRepo: Repository<VocabularyCard>,
  ) { }

  /** Get all cards due for review today for a specific user */
  async getDueCards(userId: string, deckId?: string): Promise<any[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const qb = this.cardReviewRepo
      .createQueryBuilder('cr')
      .innerJoinAndSelect('cr.card', 'card')
      .innerJoinAndSelect('card.deck', 'deck')
      .where('cr.user_id = :userId', { userId })
      .andWhere('cr.next_review_date <= :today', { today })
      .andWhere(
        '(cr.last_reviewed_at IS NOT NULL OR cr.is_flagged = true OR cr.repetitions > 0)',
      );

    if (deckId) {
      qb.andWhere('card.deck_id = :deckId', { deckId });
    }

    const reviews = await qb.orderBy('cr.next_review_date', 'ASC').getMany();

    if (reviews.length === 0) return [];

    // Fetch all vocabulary cards to create distractor options for 4-choice quiz
    const allCards = await this.cardRepo.find({ take: 200 });

    return reviews.map((r) => {
      // Randomly pick question format: 50% English -> Vietnamese, 50% Vietnamese -> English
      const isEnToVi = Math.random() < 0.5;
      const questionType = isEnToVi ? 'en_to_vi' : 'vi_to_en';
      const correctAnswer = isEnToVi ? r.card.definition : r.card.term;

      let distractors: string[] = [];
      if (isEnToVi) {
        distractors = allCards
          .filter((c) => c.id !== r.cardId && c.definition !== r.card.definition)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((c) => c.definition);
      } else {
        distractors = allCards
          .filter((c) => c.id !== r.cardId && c.term.toLowerCase() !== r.card.term.toLowerCase())
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((c) => c.term);
      }

      // Shuffle correct answer with distractors
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      return {
        reviewId: r.id,
        card: r.card,
        questionType,
        correctAnswer,
        interval: r.interval,
        repetitions: r.repetitions,
        easinessFactor: r.easinessFactor,
        lastReviewedAt: r.lastReviewedAt,
        isFlagged: r.isFlagged,
        options,
      };
    });
  }

  /** Get user's review state or flagged status for cards in a deck */
  async getUserCardReviews(userId: string, cardIds: string[]): Promise<Record<string, { isFlagged: boolean; repetitions: number; nextReviewDate: Date | null }>> {
    if (!cardIds.length) return {};

    const reviews = await this.cardReviewRepo.find({
      where: { userId, cardId: In(cardIds) },
    });

    const map: Record<string, { isFlagged: boolean; repetitions: number; nextReviewDate: Date | null }> = {};
    reviews.forEach((r) => {
      map[r.cardId] = {
        isFlagged: r.isFlagged,
        repetitions: r.repetitions,
        nextReviewDate: r.nextReviewDate,
      };
    });
    return map;
  }

  /** Submit review result and update SM-2 state for user */
  async submitReview(userId: string, dto: SubmitReviewDto): Promise<CardReview> {
    let review = await this.cardReviewRepo.findOne({
      where: { userId, cardId: dto.cardId },
    });

    if (!review) {
      review = this.cardReviewRepo.create({
        userId,
        cardId: dto.cardId,
        interval: 0,
        repetitions: 0,
        easinessFactor: 2.5,
        isFlagged: true,
      });
    }

    const intervalBefore = review.interval;

    const sm2Result = calculateSM2({
      quality: dto.quality,
      repetitions: review.repetitions,
      easinessFactor: review.easinessFactor,
      interval: review.interval,
    });

    // Update SM-2 state
    review.interval = sm2Result.interval;
    review.repetitions = sm2Result.repetitions;
    review.easinessFactor = sm2Result.easinessFactor;
    review.nextReviewDate = sm2Result.nextReviewDate;
    review.lastQuality = dto.quality;
    review.lastReviewedAt = new Date();
    await this.cardReviewRepo.save(review);

    // Log the review
    const log = this.reviewLogRepo.create({
      userId,
      cardId: dto.cardId,
      sessionId: dto.sessionId || null,
      quality: dto.quality,
      responseTimeMs: dto.responseTimeMs,
      intervalBefore,
      intervalAfter: sm2Result.interval,
    });
    await this.reviewLogRepo.save(log);

    return review;
  }

  /** Toggle flag for a card in user's review schedule */
  async toggleFlag(userId: string, cardId: string, isFlagged?: boolean): Promise<CardReview> {
    let review = await this.cardReviewRepo.findOne({
      where: { userId, cardId },
    });

    const targetFlagged = isFlagged !== undefined ? isFlagged : !(review?.isFlagged ?? false);

    if (!review) {
      review = this.cardReviewRepo.create({
        userId,
        cardId,
        isFlagged: targetFlagged,
        interval: 0,
        repetitions: 0,
        easinessFactor: 2.5,
        nextReviewDate: new Date(),
      });
    } else {
      review.isFlagged = targetFlagged;
      if (targetFlagged && !review.nextReviewDate) {
        review.nextReviewDate = new Date();
      }
    }

    return this.cardReviewRepo.save(review);
  }

  /** Enroll all cards in a deck to user's SM-2 review schedule */
  async enrollDeck(userId: string, deckId: string): Promise<{ enrolledCount: number }> {
    const cards = await this.cardRepo.find({ where: { deckId } });
    if (!cards.length) return { enrolledCount: 0 };

    const existingReviews = await this.cardReviewRepo.find({
      where: { userId, cardId: In(cards.map((c) => c.id)) },
    });

    const existingMap = new Map(existingReviews.map((r) => [r.cardId, r]));
    const today = new Date();

    const toSave: CardReview[] = [];
    for (const card of cards) {
      const existing = existingMap.get(card.id);
      if (!existing) {
        toSave.push(
          this.cardReviewRepo.create({
            userId,
            cardId: card.id,
            isFlagged: true,
            interval: 0,
            repetitions: 0,
            easinessFactor: 2.5,
            nextReviewDate: today,
          }),
        );
      } else {
        existing.isFlagged = true;
        if (!existing.nextReviewDate) existing.nextReviewDate = today;
        toSave.push(existing);
      }
    }

    await this.cardReviewRepo.save(toSave);
    return { enrolledCount: toSave.length };
  }

  /** Get review statistics for user */
  async getStats(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const totalCards = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin('card.deck', 'deck')
      .where('(deck.user_id = :userId OR deck.user_id IS NULL)', { userId })
      .getCount();

    const dueToday = await this.cardReviewRepo.count({
      where: {
        userId,
        nextReviewDate: LessThanOrEqual(today),
      },
    });

    const learned = await this.cardReviewRepo.count({
      where: { userId, repetitions: 1 },
    });

    const mastered = await this.cardReviewRepo
      .createQueryBuilder('cr')
      .where('cr.user_id = :userId', { userId })
      .andWhere('cr.repetitions >= :n', { n: 4 })
      .getCount();

    const recentLogs = await this.reviewLogRepo
      .createQueryBuilder('rl')
      .select('DATE(rl.reviewed_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(rl.quality)', 'avgQuality')
      .where('rl.user_id = :userId', { userId })
      .groupBy('DATE(rl.reviewed_at)')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();

    return { totalCards, dueToday, learned, mastered, recentLogs };
  }

  /** Reset a card's SM-2 state for user */
  async resetCard(userId: string, cardId: string): Promise<CardReview> {
    let review = await this.cardReviewRepo.findOne({ where: { userId, cardId } });
    if (!review) {
      review = this.cardReviewRepo.create({ userId, cardId });
    }
    review.interval = 0;
    review.repetitions = 0;
    review.easinessFactor = 2.5;
    review.nextReviewDate = new Date();
    review.lastQuality = null;
    review.isFlagged = false;
    return this.cardReviewRepo.save(review);
  }
}

