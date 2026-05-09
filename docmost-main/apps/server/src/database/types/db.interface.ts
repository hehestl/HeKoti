import { DB } from '@hehestl/db/types/db';
import { PageEmbeddings } from '@hehestl/db/types/embeddings.types';

export interface DbInterface extends DB {
  pageEmbeddings: PageEmbeddings;
}
