import express, { Express } from 'express';
import path from 'node:path';
import { TaskController } from './controllers/task.controller';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { Queryable, PgTaskRepository } from './repositories/task.repository';
import { createTaskRoutes } from './routes/task.routes';
import { TaskService } from './services/task.service';

export interface AppOptions {
  db: Queryable;
  timeZone: string;
}

/**
 * Monta a aplicação Express.
 * Aqui as camadas são conectadas (injeção de dependências):
 *   Repository -> Service -> Controller -> Rotas
 */
export function createApp({ db, timeZone }: AppOptions): Express {
  const repository = new PgTaskRepository(db);
  const service = new TaskService(repository, { timeZone });
  const controller = new TaskController(service);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // API REST
  app.use('/tasks', createTaskRoutes(controller));

  // Interface (View): HTML, CSS e JavaScript do frontend
  app.use(express.static(path.join(__dirname, 'views', 'public')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
