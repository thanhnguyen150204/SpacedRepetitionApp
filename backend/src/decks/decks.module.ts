import { VocabularyCard } from '../entities/vocabulary-card.entity';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, VocabularyCard])],
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
