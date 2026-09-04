import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { VocabularyCard } from './vocabulary-card.entity';

@Entity('card_reviews')
@Unique(['cardId'])
export class CardReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => VocabularyCard, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'card_id' })
  card: VocabularyCard;

  @Column({ default: 0 })
  interval: number;

  @Column({ default: 0 })
  repetitions: number;

  @Column({ name: 'easiness_factor', type: 'float', default: 2.5 })
  easinessFactor: number;

  @Column({ name: 'next_review_date', type: 'date', nullable: true })
  nextReviewDate: Date;

  @Column({ name: 'last_quality', type: 'int', nullable: true })
  lastQuality: number;

  @Column({ name: 'last_reviewed_at', type: 'timestamp', nullable: true })
  lastReviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
