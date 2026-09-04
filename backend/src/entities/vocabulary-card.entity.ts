import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Deck } from './deck.entity';

export enum CardSource {
  MANUAL = 'manual',
  OCR = 'ocr',
  IMPORT = 'import',
}

@Entity('vocabulary_cards')
export class VocabularyCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deck_id' })
  deckId: string;

  @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;

  @Column({ length: 500 })
  term: string;

  @Column({ type: 'text' })
  definition: string;

  @Column({ length: 200, nullable: true })
  phonetic: string;

  @Column({ name: 'part_of_speech', length: 50, nullable: true })
  partOfSpeech: string;

  @Column({ name: 'example_sentence', type: 'text', nullable: true })
  exampleSentence: string;

  @Column({ name: 'example_translation', type: 'text', nullable: true })
  exampleTranslation: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'enum', enum: CardSource, default: CardSource.MANUAL })
  source: CardSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
