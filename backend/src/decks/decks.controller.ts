import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.decksService.findAll(req.user?.id);
  }

  @Get('public')
  findPublicDecks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.decksService.findPublicDecks(
      page ? Number(page) : 1,
      limit ? Number(limit) : 9,
      search || '',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.decksService.findOne(id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() dto: CreateDeckDto, @Request() req: any) {
    return this.decksService.create(dto, req.user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/clone')
  clone(@Param('id') id: string, @Request() req: any) {
    return this.decksService.clonePublicDeck(id, req.user?.id);
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
