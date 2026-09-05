import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionType } from '../entities/study-session.entity';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.sessionsService.findAll(req.user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('start')
  start(@Request() req: any, @Body() body: { deckId: string; sessionType: SessionType }) {
    return this.sessionsService.start(body.deckId, body.sessionType, req.user?.id);
  }

  @Put(':id/end')
  end(
    @Param('id') id: string,
    @Body() body: { cardsCorrect: number; cardsWrong: number },
  ) {
    return this.sessionsService.end(id, body.cardsCorrect, body.cardsWrong);
  }
}

