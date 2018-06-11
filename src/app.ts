import bodyParser from 'body-parser';
import config from 'config';
import debug from 'debug';
import express from 'express';
import { body, param } from 'express-validator/check';
import { sanitizeBody, sanitizeParam } from 'express-validator/filter';

import LocationDatabase from './locations';
import * as router from './routes/locations';

const debugLog = debug('coffeecoffeecoffee:app');

// Sane maximum input length for string fields
const MAX_LENGTH = 100;

const idValidators = [
    param('id').isInt({min: 0}),
    sanitizeParam('id').toInt(),
];
const bodyValidators = [
    body('name').isLength({min: 1, max: MAX_LENGTH}).trim(),
    body('address').isLength({min: 1, max: MAX_LENGTH}).trim(),
    body('lat').isFloat({min: -90, max: 90}),
    body('lng').isFloat({min: -180, max: 180}),
    sanitizeBody('lat').toFloat(),
    sanitizeBody('lng').toFloat(),
];
const optionalBodyValidators = [
    body('name').isLength({min: 1, max: MAX_LENGTH}).trim().optional(),
    body('address').isLength({min: 1, max: MAX_LENGTH}).trim().optional(),
    body('lat').isFloat({min: -90, max: 90}).optional(),
    body('lng').isFloat({min: -180, max: 180}).optional(),
    sanitizeBody('lat').toFloat(),
    sanitizeBody('lng').toFloat(),
];

/**
 * Loads the configured database file into a new location database and configures the router to use it.
 *
 * @returns {Promise<express.Application>} promise of a fully loaded Express application ready to attach to a server
 */
export function init(): Promise<express.Application> {
    return new Promise<express.Application>((resolve, reject) => {
        LocationDatabase.load(config.get('app.database'))
            .then((locationDatabase: LocationDatabase) => {
                debugLog('Loaded %s locations', locationDatabase.size);
                router.setLocationDatabase(locationDatabase);

                const app = express();
                app.use(express.json());
                app.use(bodyParser.json());

                app.post('/locations', bodyValidators, router.postHandler);
                app.get('/locations/:id', idValidators, router.getHandler);
                app.put('/locations/:id', idValidators, bodyValidators, router.putHandler);
                app.patch('/locations/:id', idValidators, optionalBodyValidators, router.patchHandler);
                app.delete('/locations/:id', idValidators, router.deleteHandler);

                resolve(app);
            })
            .catch((err) => {
                reject(err);
            });
    });
}
