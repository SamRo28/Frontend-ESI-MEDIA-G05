export type ContentTypeFilter = 'all' | 'video' | 'audio';

export type SuscripcionFilter = 'ANY' | 'VIP' | 'STANDARD';

export type EdadFilter = 'TP' | '18' | null;

export interface ContentFilters {
  contentType: ContentTypeFilter;
  tags: string[];
  suscripcion: SuscripcionFilter;
  edad: EdadFilter;
  resoluciones: string[];
}
