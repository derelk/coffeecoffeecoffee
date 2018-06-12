import debug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator/check';
import pick from 'lodash.pick';

import geocode, {GeocodeError, GeocodeResponse} from '../geocode';
import LocationDatabase, {ICoordinates, ILocation, INewLocation} from '../locations';

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

export async function findHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()}).end();
    }

    //
    // Attempt to geocode address
    //
    let coordinates: ICoordinates;
    try {
        coordinates = await geocode(req.query.address);
    } catch (err) {
        if (err instanceof GeocodeError) {
            if (err.code === GeocodeResponse.ZERO_RESULTS) {
                // Effectively a user error; 400 for bad address input
                res.status(400).json({
                    errors: [{
                        msg: 'unable to geocode address',
                        value: req.query.address,
                    }]}).end();
            } else {
                // Other failures are a server problem, e.g. over limit, bad key, etc.; let them 500
                next(err);
            }
        } else {
            // Unknown error in geocoding connection, let this 500 too
            next(err);
        }
        return;
    }

    //
    // Determine nearest location
    //
    let location: ILocation | undefined;

    // Attempting to optimize distance sorting load by expecting to find nearby locations, but willing to expand up to 7
    // miles if necessary.
    for (let radius of [0.5, 1, 3, 7]) {
        location = database.findNearest(coordinates, radius);
        if (location) {
            break;
        }
    }

    if (!location) {
        return res.status(200).json({
            errors: [{
                msg: 'no locations found within 7 miles',
                value: req.query.address,
            }]}).end();
    } else {
        return res.status(200).json(location).end();
    }
}
