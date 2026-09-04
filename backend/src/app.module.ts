import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Deck } from './entities/deck.entity';
import { VocabularyCard } from './entities/vocabulary-card.entity';
import { CardReview } from './entities/card-review.entity';
import { ReviewLog } from './entities/review-log.entity';
import { StudySession } from './entities/study-session.entity';
import { Question } from './entities/question.entity';
import { User } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { DecksModule } from './decks/decks.module';
import { CardsModule } from './cards/cards.module';
import { ReviewModule } from './review/review.module';
import { SessionsModule } from './sessions/sessions.module';
import { QuestionsModule } from './questions/questions.module';
import { OcrModule } from './ocr/ocr.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME', 'spaced_user'),
        password: configService.get('DB_PASSWORD', 'spaced_pass'),
        database: configService.get('DB_DATABASE', 'spaced_repetition'),
        entities: [User, Deck, VocabularyCard, CardReview, ReviewLog, StudySession, Question],
        synchronize: true,
        logging: false,
        ssl: configService.get('DB_HOST') !== 'localhost' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    DecksModule,
    CardsModule,
    ReviewModule,
    SessionsModule,
    QuestionsModule,
    OcrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
