import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from '../config/swagger';
import { Router } from 'express';

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerConfig));

export default router; 