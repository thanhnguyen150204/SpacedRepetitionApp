import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto, BulkCreateCardDto } from './dto/create-card.dto';

@Controller('decks/:deckId/cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  findAll(@Param('deckId') deckId: string) {
    return this.cardsService.findByDeck(deckId);
  }

  @Post()
  create(@Param('deckId') deckId: string, @Body() dto: CreateCardDto) {
    return this.cardsService.create(deckId, dto);
  }

  @Post('bulk')
  bulkCreate(@Param('deckId') deckId: string, @Body() dto: BulkCreateCardDto) {
    return this.cardsService.bulkCreate(deckId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCardDto>) {
    return this.cardsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardsService.remove(id);
  }
}
