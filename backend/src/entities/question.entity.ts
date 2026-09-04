import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { VocabularyCard } from './vocabulary-card.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  TRUE_FALSE = 'true_false',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => VocabularyCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: VocabularyCard;

  @Column({ name: 'question_type', type: 'enum', enum: QuestionType })
  questionType: QuestionType;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'correct_answer', type: 'text' })
  correctAnswer: string;

  @Column({ type: 'jsonb', nullable: true })
  distractors: string[];

  @Column({ type: 'int', default: 1 })
  difficulty: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
