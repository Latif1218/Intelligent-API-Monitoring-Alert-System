import config from '../../../shared/config/index.js';
import logger from '../../../shared/config/logger.js';
import alertRepository from '../repository/AlertRepository.js';
import { AIAlertGenerator } from '../ai/aiAlertGenerator.js';
import { EmailService } from '../notification/emailService.js';
import { AlertService } from '../service/alertService.js';
import { AlertController } from '../controller/alertController.js';

class Container {
    static init() {
        const aiAlertGenerator = new AIAlertGenerator({ llm: config.llm, logger });
        const emailService = new EmailService({ smtp: config.smtp, logger });
        const alertService = new AlertService({
            alertRepository,
            aiAlertGenerator,
            emailService,
            dedupeWindowMinutes: config.alerts.dedupeWindowMinutes,
            logger,
        });
        const controllers = { alertController: new AlertController({ alertService }) };
        logger.info(`Alerts module ready (LLM: ${aiAlertGenerator.enabled ? config.llm.provider : 'disabled -> template fallback'}, email: ${emailService.enabled ? 'on' : 'off'})`);
        return { services: { alertService }, controllers };
    }
}

export default Container.init();
