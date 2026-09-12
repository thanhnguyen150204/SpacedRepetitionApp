import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-sentence')
  async generateSentence(
    @Body() body: { term: string; definition: string; partOfSpeech?: string; existingExample?: string },
  ) {
    return this.aiService.generateSentencePractice(
      body.term,
      body.definition,
      body.partOfSpeech,
      body.existingExample,
    );
  }

  @Post('evaluate-sentence')
  async evaluateSentence(
    @Body() body: { term: string; definition: string; userSentence: string },
  ) {
    return this.aiService.evaluateSentence(
      body.term,
      body.definition,
      body.userSentence,
    );
  }
}
