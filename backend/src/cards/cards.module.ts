import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { CardReview } from '../entities/card-review.entity';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { DecksModule } from '../decks/decks.module';

@Module({
  imports: [TypeOrmModule.forFeature([VocabularyCard, CardReview]), DecksModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
