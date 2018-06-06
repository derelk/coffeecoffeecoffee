import parse from 'csv-parse';
import debug from 'debug';
import fs from 'fs';
import GeoTree from 'geo-tree';

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

export interface ILocation {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
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
                    locationDatabase.add(location);
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

    // Sequentially incrementing ID for locations added to GeoTree
    protected static nextTreeLocationID = -1;

    protected static getNextTreeLocationID(): number {
        // I feel weird not using a mutex, but the internet insists Node is thread-safe except in extenuating
        // circumstances that don't seem to apply here.
        LocationDatabase.nextTreeLocationID += 1;
        return LocationDatabase.nextTreeLocationID;
    }

    /* The limitation of being unable to update or remove entries from the GeoTree requires some internal gymnastics.
     * There are two IDs: the public location ID, as loaded from the CSV file and visible as `ILocation.id`; and an
     * internal tree location ID, which is an incremental ID that is never re-used and stored in the GeoTree as the
     * `data` property. When a location is updated, it will have a new underlying ID in the GeoTree, and the mapping
     * from the old tree ID is discarded, effectively erasing it (as long as the `find()` results are filtered to remove
     * old locations that no longer map).
     */

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

    /**
     * The current number of locations in the database
     *
     * @returns {number}
     */
    public get size(): number {
        return this.locationMap.size;
    }

    /**
     * Inserts the given location into the database.
     *
     * @param {ILocation} location
     */
    public add(location: ILocation): void {
        this.update(location);
    }

    /**
     * Returns the location with the the given ID if it exists, or undefined if not.
     *
     * @param {number} id of location
     * @returns {ILocation | undefined}
     */
    public get(id: number): ILocation | undefined {
        return this.locationMap.get(id);
    }

    /**
     * Updates a location in the database. Succeeds unconditionally and is functionally equivalent to `add()`.
     *
     * @param {ILocation} location
     */
    public update(location: ILocation): void {
        // Effectively erase previous location by deleting its treeLocationID fom the map
        let prevLocation = this.locationMap.get(location.id);
        if (prevLocation) {
            this.treeLocationMap.delete(prevLocation.treeLocationID);
        }

        let updatedLocation = new Location(location, LocationDatabase.getNextTreeLocationID());
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
}
