import parse from 'csv-parse';
import debug from 'debug';
import fs from 'fs';
import GeoTree from 'geo-tree';
import geolib from 'geolib';

/* tslint:disable:max-classes-per-file
 * I like this idea generally, but the lack of package-level privacy complicates it. I couldn't find a way to only
 * expose the `ILocation` interface in the public API if they weren't within the same file, and I want to keep Location
 * private due to strictly internal data that needs to be stored on it.
 */

const debugLog = debug('coffeecoffeecoffee:locations');

// Extending to add `cast` option; @types/csv-parse is outdated and doesn't support it
interface IOptionsWithCast extends parse.Options {
    /**
     * If true, the parser will attempt to convert input string to native types. If a function, receive the value as
     * first argument, a context as second argument and return a new value.
     */
    cast?: boolean;
}

export interface ICoordinates {
    lat: number;
    lng: number;
}

export interface INewLocation extends ICoordinates {
    name: string;
    address: string;
}

export interface ILocation extends INewLocation {
    id: number;
}

class Location implements ILocation {
    public id: number;
    public name: string;
    public address: string;
    public lat: number;
    public lng: number;
    public treeLocationID: number;

    constructor(location: ILocation, treeLocationID: number) {
        this.id = location.id;
        this.name = location.name;
        this.address = location.address;
        this.lat = location.lat;
        this.lng = location.lng;
        this.treeLocationID = treeLocationID;
    }
}

/**
 * In-memory data store for coffee shop locations.
 */
export default class LocationDatabase {
    /**
     * Loads a CSV file from the given path and returns the promise of a LocationDatabase containing that file's data.
     * File format is assumed to be 5 columns: id (number), name (string), address (string), latitude (number),
     * longitude (number).
     * @param {string} path
     * @returns {Promise<locations.LocationDatabase>}
     */
    public static async load(path: string) {
        debugLog('Start loading locations');
        return new Promise<LocationDatabase>((resolve, reject) => {
            let locationDatabase = new LocationDatabase();

            // parses into objects conforming to ILocation interface (and trims whitespace)
            let parser = parse({
                cast: true,
                columns: ['id', 'name', 'address', 'lat', 'lng'],
                trim: true,
            } as IOptionsWithCast);

            function onError(err: Error) {
                debugLog('Error on load');
                reject(err);
            }

            parser.on('error', onError);
            parser.on('readable', () => {
                let location: ILocation = parser.read();
                while (location) {
                    debugLog(location);
                    locationDatabase.update(location);

                    // Keep track of highest ID used
                    if (location.id > locationDatabase.nextLocationID) {
                        locationDatabase.nextLocationID = location.id;
                    }
                    location = parser.read();
                }
            });
            parser.on('end', () => {
                debugLog('Finish loading locations');
                resolve(locationDatabase);
            });

            let stream = fs.createReadStream(path);
            stream.on('error', onError);

            // don't pipe into CSV parser until the file handler is successfully opened
            stream.on('open', () => {
                stream.pipe(parser);
            });
        });
    }

    // Sequentially incrementing ID for locations added to database
    protected nextLocationID = -1;

    // Sequentially incrementing ID for locations added to GeoTree
    protected nextTreeLocationID = -1;

    // Map of location ID to Location object.
    private locationMap = new Map<number, Location>();

    // Map of tree location ID to Location ID.
    private treeLocationMap = new Map<number, number>();

    // The `data` field of the GeoTree entries is a number referencing the Location's `treeLocationID` property, i.e.
    // the key of `treeLocationMap`.
    private tree: GeoTree = new GeoTree();

    /**
     * Creates a new, empty LocationDatabase.
     */
    // tslint:disable-next-line:no-empty
    constructor() {
    }

    /* The limitation of being unable to update or remove entries from the GeoTree requires some internal gymnastics.
     * There are two IDs: the public location ID, as loaded from the CSV file and visible as `ILocation.id`; and an
     * internal tree location ID, which is an incremental ID that is never re-used and stored in the GeoTree as the
     * `data` property. When a location is updated, it will have a new underlying ID in the GeoTree, and the mapping
     * from the old tree ID is discarded, effectively erasing it (as long as the `find()` results are filtered to remove
     * old locations that no longer map).
     */

    /**
     * The current number of locations in the database
     *
     * @returns {number}
     */
    public get size(): number {
        return this.locationMap.size;
    }

    /**
     * Assigns an ID to the given location and inserts it into the database. Do not use this with an ILocation, which
     * already has an ID; use `update()` instead.
     *
     * @param {INewLocation} location
     * @returns {ILocation}
     */
    public add(location: INewLocation): ILocation {
        let newLocation = location as ILocation;
        newLocation.id = this.getNextLocationID();
        this.update(newLocation);
        return newLocation;
    }

    /**
     * Returns the location with the the given ID if it exists, or undefined if not.
     *
     * @param {number} id of location
     * @returns {ILocation | undefined}
     */
    public get(id: number): ILocation | undefined {
        let location = this.locationMap.get(id);
        if (location) {
            delete location.treeLocationID;
        }
        return location;
    }

    /**
     * Updates a location in the database. Succeeds unconditionally, whether or not this is actually an updated location
     * or a new one. It differs from `add()` only in that `add()` determines the `id` of the location.
     *
     * @param {ILocation} location
     */
    public update(location: ILocation): void {
        // Effectively erase previous location by deleting its treeLocationID fom the map
        let prevLocation = this.locationMap.get(location.id);
        if (prevLocation) {
            this.treeLocationMap.delete(prevLocation.treeLocationID);
        }

        let updatedLocation = new Location(location, this.getNextTreeLocationID());
        this.locationMap.set(updatedLocation.id, updatedLocation);
        this.treeLocationMap.set(updatedLocation.treeLocationID, updatedLocation.id);
        this.tree.insert({ lat: updatedLocation.lat, lng: updatedLocation.lng, data: updatedLocation.treeLocationID });
    }

    /**
     * Removes the location with the given ID from the database, if it exists.
     *
     * @param {number} id
     * @returns {boolean} whether a location was successfully removed
     */
    public remove(id: number): boolean {
        let location = this.locationMap.get(id);
        if (!location) {
            return false;
        }
        this.treeLocationMap.delete(location.treeLocationID);
        return this.locationMap.delete(id);
    }

    /**
     * Finds the location nearest to the given coordinates within the given radius.
     * @param {ICoordinates} coordinates
     * @param {number} radius in miles (default: 1)
     * @returns {ILocation | undefined} nearest ILocation, or undefined if none found within radius
     */
    public findNearest(coordinates: ICoordinates, radius = 1): ILocation | undefined {
        // tuple of (distance, Location) used to track which location is nearest
        let closest: [number, Location | undefined] = [Number.MAX_SAFE_INTEGER, undefined];

        // all locations within 1 mi, unordered
        let treeIDs: number[] = this.tree.find(coordinates, radius, 'mi');

        // For each tree ID, see if it's still active, i.e. in treeLocationMap. If not, it was deleted or updated.
        // If so, look up the Location object and calculate the distance and track which is closest.
        for (let treeID of treeIDs) {
            let locationID = this.treeLocationMap.get(treeID);
            if (locationID) {
                let location = this.locationMap.get(locationID);
                if (location) {
                    let distance = geolib.getDistance(
                        {latitude: coordinates.lat, longitude: coordinates.lng},
                        {latitude: location.lat, longitude: location.lng},
                    );
                    debugLog([distance, location]);
                    if (distance < closest[0]) {
                        closest[0] = distance;
                        closest[1] = location;
                    }
                }
            }
        }
        debugLog(closest);
        return closest[1];
    }

    protected getNextLocationID(): number {
        // I feel weird not using a mutex, but the internet insists Node is thread-safe except in extenuating
        // circumstances that don't seem to apply here.
        this.nextLocationID += 1;
        return this.nextLocationID;
    }

    protected getNextTreeLocationID(): number {
        // Same mutex disclaimer as above
        this.nextTreeLocationID += 1;
        return this.nextTreeLocationID;
    }
}
