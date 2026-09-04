import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Deck } from '../entities/deck.entity';
import { CreateDeckDto } from './dto/create-deck.dto';

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck)
    private decksRepository: Repository<Deck>,
  ) {}

  async findAll(userId?: string): Promise<Deck[]> {
    if (userId) {
      return this.decksRepository.find({
        where: [{ userId }, { userId: IsNull() }],
        order: { createdAt: 'DESC' },
      });
    }
    return this.decksRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: { cards: true },
    });
    if (!deck) throw new NotFoundException(`Deck #${id} not found`);
    return deck;
  }

  async create(dto: CreateDeckDto, userId?: string): Promise<Deck> {
    const deck = this.decksRepository.create({ ...dto, userId });
    return this.decksRepository.save(deck);
  }

  async update(id: string, dto: Partial<CreateDeckDto>): Promise<Deck> {
    await this.decksRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const deck = await this.findOne(id);
    await this.decksRepository.remove(deck);
  }

  async updateCardCount(deckId: string): Promise<void> {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId },
      relations: { cards: true },
    });
    if (deck) {
      deck.totalCards = deck.cards.length;
      await this.decksRepository.save(deck);
    }
  }
}
