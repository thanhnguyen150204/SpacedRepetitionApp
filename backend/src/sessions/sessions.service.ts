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

  async start(deckId: string | null, sessionType: SessionType): Promise<StudySession> {
    const validDeckId = deckId && deckId.trim() !== '' ? deckId : null;
    const session = this.sessionRepo.create({ deckId: validDeckId, sessionType });
    return this.sessionRepo.save(session);
  }

  async end(id: string, cardsCorrect: number, cardsWrong: number): Promise<StudySession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    session.cardsCorrect = cardsCorrect;
    session.cardsWrong = cardsWrong;
    session.cardsTotal = cardsCorrect + cardsWrong;
    session.endedAt = new Date();
    session.durationSeconds = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );
    return this.sessionRepo.save(session);
  }

  async findAll(): Promise<StudySession[]> {
    return this.sessionRepo.find({ order: { startedAt: 'DESC' }, take: 50 });
  }
}
