import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardReview } from '../entities/card-review.entity';
import { ReviewLog } from '../entities/review-log.entity';
import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [TypeOrmModule.forFeature([CardReview, ReviewLog, VocabularyCard])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
