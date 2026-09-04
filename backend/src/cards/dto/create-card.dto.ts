import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MaxLength(500)
  term: string;

  @IsString()
  definition: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsString()
  partOfSpeech?: string;

  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @IsOptional()
  @IsString()
  exampleTranslation?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class BulkCreateCardDto {
  @IsArray()
  cards: CreateCardDto[];
}
