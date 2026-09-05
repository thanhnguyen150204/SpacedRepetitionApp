import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudySession, SessionType } from '../entities/study-session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(StudySession)
    private sessionRepo: Repository<StudySession>,
  ) {}

  async start(deckId: string | null, sessionType: SessionType, userId?: string): Promise<StudySession> {
    const validDeckId = deckId && deckId.trim() !== '' ? deckId : null;
    const session = this.sessionRepo.create({ deckId: validDeckId, sessionType, userId });
    return this.sessionRepo.save(session);
  }

  async end(id: string, cardsCorrect: number, cardsWrong: number): Promise<StudySession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return null;
    session.cardsCorrect = cardsCorrect;
    session.cardsWrong = cardsWrong;
    session.cardsTotal = cardsCorrect + cardsWrong;
    session.endedAt = new Date();
    session.durationSeconds = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    return this.sessionRepo.save(session);
  }

  async findAll(userId?: string): Promise<StudySession[]> {
    if (userId) {
      return this.sessionRepo.find({ where: { userId }, order: { startedAt: 'DESC' }, take: 50 });
    }
    return this.sessionRepo.find({ order: { startedAt: 'DESC' }, take: 50 });
  }
}
