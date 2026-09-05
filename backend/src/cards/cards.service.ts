import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabularyCard, CardSource } from '../entities/vocabulary-card.entity';
import { CardReview } from '../entities/card-review.entity';
import { CreateCardDto, BulkCreateCardDto } from './dto/create-card.dto';
import { DecksService } from '../decks/decks.service';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(VocabularyCard)
    private cardsRepository: Repository<VocabularyCard>,
    @InjectRepository(CardReview)
    private reviewRepository: Repository<CardReview>,
    private decksService: DecksService,
  ) {}

  async findByDeck(deckId: string): Promise<VocabularyCard[]> {
    return this.cardsRepository.find({
      where: { deckId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<VocabularyCard> {
    const card = await this.cardsRepository.findOne({ where: { id } });
    if (!card) throw new NotFoundException(`Card #${id} not found`);
    return card;
  }

  async create(deckId: string, dto: CreateCardDto, source = CardSource.MANUAL): Promise<VocabularyCard> {
    const card = this.cardsRepository.create({ ...dto, deckId, source });
    const saved = await this.cardsRepository.save(card);

    await this.decksService.updateCardCount(deckId);
    return saved;
  }

  async bulkCreate(deckId: string, dto: BulkCreateCardDto, source = CardSource.MANUAL): Promise<VocabularyCard[]> {
    const results: VocabularyCard[] = [];
    for (const cardDto of dto.cards) {
      const card = await this.create(deckId, cardDto, source);
      results.push(card);
    }
    return results;
  }

  async update(id: string, dto: Partial<CreateCardDto>): Promise<VocabularyCard> {
    await this.cardsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const card = await this.findOne(id);
    const deckId = card.deckId;
    await this.cardsRepository.remove(card);
    await this.decksService.updateCardCount(deckId);
  }
}
