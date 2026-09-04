import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../entities/question.entity';
import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, VocabularyCard])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
