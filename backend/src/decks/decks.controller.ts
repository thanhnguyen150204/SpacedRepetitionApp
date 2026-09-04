import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';

@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  findAll() {
    return this.decksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.decksService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDeckDto) {
    return this.decksService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateDeckDto>) {
    return this.decksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.decksService.remove(id);
  }
}
