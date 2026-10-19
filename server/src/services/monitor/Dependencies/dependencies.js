import config from '../../../shared/config/index.js';
import logger from '../../../shared/config/logger.js';
import alertContainer from '../../alerts/Dependencies/dependencies.js';
import { MonitorService } from '../service/monitorService.js';
import { MonitorController } from '../controller/monitorController.js';

class Container {
    static init() {
        const monitorService = new MonitorService({
            alertService: alertContainer.services.alertService,
            thresholds: config.alerts.thresholds,
            maxBatchSize: config.alerts.maxBatchSize,
            logger,
        });
        const controllers = { monitorController: new MonitorController({ monitorService }) };
        return { services: { monitorService }, controllers };
    }
}

export default Container.init();
