import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionType } from '../entities/study-session.entity';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @Post('start')
  start(@Body() body: { deckId: string; sessionType: SessionType }) {
    return this.sessionsService.start(body.deckId, body.sessionType);
  }

  @Put(':id/end')
  end(
    @Param('id') id: string,
    @Body() body: { cardsCorrect: number; cardsWrong: number },
  ) {
    return this.sessionsService.end(id, body.cardsCorrect, body.cardsWrong);
  }
}
