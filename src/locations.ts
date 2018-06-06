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

type LocationMap = Map<number, Location>;

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

    constructor(location: ILocation) {
        this.id = location.id;
        this.name = location.name;
        this.address = location.address;
        this.lat = location.lat;
        this.lng = location.lng;
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

    // Map of location ID to Location object.
    private locationMap: LocationMap = new Map<number, Location>();

    /* The `data` field of the GeoTree entries is a number referencing the Location's `id` property, i.e. the key of
     * the Location in `locationMap`.
     */
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
        /* WARNING:
         * There is no way to update a location in the GeoTree, nor a way to conditionally insert. This function will
         * therefore insert duplicates at the same location or another location. This must be accounted for in search.
         */
        this.locationMap.set(location.id, location);
        this.tree.insert({lat: location.lat, lng: location.lng, data: location.id});
    }

    /**
     * Removes the location with the given ID from the database, if it exists.
     *
     * @param {number} id
     * @returns {boolean} whether a location was successfully removed
     */
    public remove(id: number): boolean {
        /* WARNING:
         * There is no way to remove a location from the GeoTree. This function only deletes the location from the map,
         * and `find()` results on the tree will continue to return otherwise-deleted locations. This must be accounted
         * for in search.
         */
        return this.locationMap.delete(id);
    }
}
