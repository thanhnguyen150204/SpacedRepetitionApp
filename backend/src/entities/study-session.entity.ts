import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Deck } from './deck.entity';
import { User } from './user.entity';

export enum SessionType {
  FLASHCARD = 'flashcard',
  QUIZ = 'quiz',
  SPACED_REVIEW = 'spaced_review',
}

@Entity('study_sessions')
export class StudySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'deck_id', nullable: true })
  deckId: string;

  @ManyToOne(() => Deck, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;

  @Column({ name: 'session_type', type: 'enum', enum: SessionType })
  sessionType: SessionType;

  @Column({ name: 'cards_total', default: 0 })
  cardsTotal: number;

  @Column({ name: 'cards_correct', default: 0 })
  cardsCorrect: number;

  @Column({ name: 'cards_wrong', default: 0 })
  cardsWrong: number;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;
}
