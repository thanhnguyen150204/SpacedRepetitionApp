import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('due')
  getDue(@Query('deckId') deckId?: string) {
    return this.reviewService.getDueCards(deckId);
  }

  @Get('stats')
  getStats() {
    return this.reviewService.getStats();
  }

  @Post('submit')
  submit(@Body() dto: SubmitReviewDto) {
    return this.reviewService.submitReview(dto);
  }

  @Post('reset/:cardId')
  reset(@Param('cardId') cardId: string) {
    return this.reviewService.resetCard(cardId);
  }
}
