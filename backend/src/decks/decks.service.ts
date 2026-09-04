import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Deck } from '../entities/deck.entity';
import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { CreateDeckDto } from './dto/create-deck.dto';

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck)
    private decksRepository: Repository<Deck>,
    @InjectRepository(VocabularyCard)
    private cardsRepository: Repository<VocabularyCard>,
  ) {}

  async findAll(userId?: string): Promise<Deck[]> {
    if (userId) {
      return this.decksRepository.find({
        where: [{ userId }, { userId: IsNull() }],
        relations: { user: true },
        order: { createdAt: 'DESC' },
      });
    }
    return this.decksRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findPublicDecks(page = 1, limit = 9, search = ''): Promise<{ data: Deck[]; total: number; page: number; totalPages: number }> {
    const qb = this.decksRepository.createQueryBuilder('deck')
      .leftJoinAndSelect('deck.user', 'user')
      .where('deck.isPublic = :isPublic', { isPublic: true });

    if (search && search.trim()) {
      qb.andWhere('(deck.name ILIKE :search OR deck.description ILIKE :search)', { search: `%${search.trim()}%` });
    }

    qb.orderBy('deck.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: { cards: true, user: true },
    });
    if (!deck) throw new NotFoundException(`Deck #${id} not found`);
    return deck;
  }

  async create(dto: CreateDeckDto, userId?: string): Promise<Deck> {
    const deck = this.decksRepository.create({
      ...dto,
      isPublic: dto.isPublic ?? false,
      userId,
    });
    return this.decksRepository.save(deck);
  }

  async clonePublicDeck(deckId: string, userId?: string): Promise<Deck> {
    const source = await this.findOne(deckId);
    const newDeck = this.decksRepository.create({
      name: `${source.name} (Copy)`,
      description: source.description,
      coverImage: source.coverImage,
      isPublic: false,
      userId,
      totalCards: source.cards?.length || 0,
    });

    const savedDeck = await this.decksRepository.save(newDeck);

    if (source.cards && source.cards.length > 0) {
      const clonedCards = source.cards.map((c) =>
        this.cardsRepository.create({
          deckId: savedDeck.id,
          term: c.term,
          definition: c.definition,
          phonetic: c.phonetic,
          partOfSpeech: c.partOfSpeech,
          exampleSentence: c.exampleSentence,
          exampleTranslation: c.exampleTranslation,
          imageUrl: c.imageUrl,
          tags: c.tags,
          source: c.source,
        }),
      );
      await this.cardsRepository.save(clonedCards);
    }

    return this.findOne(savedDeck.id);
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
