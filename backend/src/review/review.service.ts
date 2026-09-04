import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
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
  ) {}

  /** Get all cards due for review today */
  async getDueCards(deckId?: string): Promise<any[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const qb = this.cardReviewRepo
      .createQueryBuilder('cr')
      .innerJoinAndSelect('cr.card', 'card')
      .innerJoinAndSelect('card.deck', 'deck')
      .where('cr.next_review_date <= :today', { today });

    if (deckId) {
      qb.andWhere('card.deck_id = :deckId', { deckId });
    }

    const reviews = await qb.orderBy('cr.next_review_date', 'ASC').getMany();

    return reviews.map((r) => ({
      reviewId: r.id,
      card: r.card,
      interval: r.interval,
      repetitions: r.repetitions,
      easinessFactor: r.easinessFactor,
      lastReviewedAt: r.lastReviewedAt,
    }));
  }

  /** Submit review result and update SM-2 state */
  async submitReview(dto: SubmitReviewDto): Promise<CardReview> {
    const review = await this.cardReviewRepo.findOne({
      where: { cardId: dto.cardId },
    });

    if (!review) throw new NotFoundException(`Review state for card ${dto.cardId} not found`);

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

  /** Get review statistics */
  async getStats(): Promise<any> {
    const totalCards = await this.cardReviewRepo.count();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueToday = await this.cardReviewRepo.count({
      where: { nextReviewDate: LessThanOrEqual(today) },
    });

    const learned = await this.cardReviewRepo.count({
      where: { repetitions: 1 },
    });
    const mastered = await this.cardReviewRepo
      .createQueryBuilder('cr')
      .where('cr.repetitions >= :n', { n: 4 })
      .getCount();

    const recentLogs = await this.reviewLogRepo
      .createQueryBuilder('rl')
      .select('DATE(rl.reviewed_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(rl.quality)', 'avgQuality')
      .groupBy('DATE(rl.reviewed_at)')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();

    return { totalCards, dueToday, learned, mastered, recentLogs };
  }

  /** Reset a card's SM-2 state */
  async resetCard(cardId: string): Promise<CardReview> {
    const review = await this.cardReviewRepo.findOne({ where: { cardId } });
    if (!review) throw new NotFoundException(`Review not found`);
    review.interval = 0;
    review.repetitions = 0;
    review.easinessFactor = 2.5;
    review.nextReviewDate = new Date();
    review.lastQuality = null;
    return this.cardReviewRepo.save(review);
  }
}
