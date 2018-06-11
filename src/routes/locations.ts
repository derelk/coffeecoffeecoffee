import debug from 'debug';
import { Request, Response} from 'express';
import { validationResult } from 'express-validator/check';
import pick from 'lodash.pick';

import LocationDatabase, {ILocation, INewLocation} from '../locations';

const debugLog = debug('coffeecoffeecoffee:routes/locations');

const locationProperties = ['name', 'address', 'lat', 'lng'];

let database: LocationDatabase;
export function setLocationDatabase(locationDatabase: LocationDatabase) {
    database = locationDatabase;
}

export function postHandler(req: Request, res: Response): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    }

    let location: INewLocation = pick(req.body, locationProperties) as INewLocation;  // filter out extra properties
    res.status(201).json(database.add(location));
}

export function getHandler(req: Request, res: Response): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    }

    let location = database.get(req.params.id);
    if (location) {
        res.json(location);
    } else {
        res.status(404).end();
    }
}

export function putHandler(req: Request, res: Response): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    } else if (!database.get(req.params.id)) {
        return res.status(404).end();
    }

    let location: ILocation = pick(req.body, locationProperties) as ILocation; // filter out extra properties
    location.id = req.params.id;
    database.update(location);
    return res.status(200).end();
}

export function patchHandler(req: Request, res: Response): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    }
    let location = database.get(req.params.id);
    if (!location) {
        return res.status(404).end();
    }

    // filter out extra properties and copy the remaining values onto the existing object
    Object.assign(location, pick(req.body, locationProperties));
    database.update(location);
    return res.status(200).end();
}

export function deleteHandler(req: Request, res: Response): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    }

    let status = database.remove(req.params.id) ? 200 : 404;
    res.status(status).end();
}
