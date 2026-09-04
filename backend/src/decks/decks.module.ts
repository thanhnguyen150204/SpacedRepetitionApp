import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck } from '../entities/deck.entity';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deck])],
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
