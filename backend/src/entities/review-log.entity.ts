import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { VocabularyCard } from './vocabulary-card.entity';
import { StudySession } from './study-session.entity';

@Entity('review_logs')
export class ReviewLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => VocabularyCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: VocabularyCard;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @ManyToOne(() => StudySession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session: StudySession;

  @Column({ type: 'int' })
  quality: number;

  @Column({ name: 'response_time_ms', type: 'int', nullable: true })
  responseTimeMs: number;

  @Column({ name: 'interval_before', type: 'int', default: 0 })
  intervalBefore: number;

  @Column({ name: 'interval_after', type: 'int', default: 0 })
  intervalAfter: number;

  @CreateDateColumn({ name: 'reviewed_at' })
  reviewedAt: Date;
}
