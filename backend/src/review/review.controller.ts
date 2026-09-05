import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('due')
  getDue(@Request() req: any, @Query('deckId') deckId?: string) {
    return this.reviewService.getDueCards(req.user.id, deckId);
  }

  @Get('user-states')
  getUserStates(@Request() req: any, @Query('cardIds') cardIdsStr?: string) {
    const cardIds = cardIdsStr ? cardIdsStr.split(',').filter(Boolean) : [];
    return this.reviewService.getUserCardReviews(req.user.id, cardIds);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.reviewService.getStats(req.user.id);
  }

  @Post('submit')
  submit(@Request() req: any, @Body() dto: SubmitReviewDto) {
    return this.reviewService.submitReview(req.user.id, dto);
  }

  @Post('toggle-flag')
  toggleFlag(@Request() req: any, @Body() body: { cardId: string; isFlagged?: boolean }) {
    return this.reviewService.toggleFlag(req.user.id, body.cardId, body.isFlagged);
  }

  @Post('enroll-deck/:deckId')
  enrollDeck(@Request() req: any, @Param('deckId') deckId: string) {
    return this.reviewService.enrollDeck(req.user.id, deckId);
  }

  @Post('reset/:cardId')
  reset(@Request() req: any, @Param('cardId') cardId: string) {
    return this.reviewService.resetCard(req.user.id, cardId);
  }
}

