import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get(':deckId')
  getForDeck(@Param('deckId') deckId: string, @Query('limit') limit?: string) {
    return this.questionsService.getForDeck(deckId, limit ? parseInt(limit) : 20);
  }

  @Post('generate/:deckId')
  generate(@Param('deckId') deckId: string) {
    return this.questionsService.generateForDeck(deckId);
  }
}
