import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';

/**
 * ROTAS - ligam método HTTP + URL ao método do Controller.
 * Não contêm lógica: apenas indicam o destino de cada requisição.
 */
export function createTaskRoutes(controller: TaskController): Router {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.patch('/:id/status', controller.updateStatus);
  router.delete('/:id', controller.remove);

  return router;
}
