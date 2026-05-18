import { MangaSourceRule } from '../types';
import { KomikindoRule } from './komikindo';
import { BacakomikRule } from './bacakomik';

export const MANGA_SOURCES: MangaSourceRule[] = [
  KomikindoRule,
  BacakomikRule,
];

export function getMangaSourceById(id: string): MangaSourceRule | undefined {
  return MANGA_SOURCES.find((source) => source.id === id);
}
