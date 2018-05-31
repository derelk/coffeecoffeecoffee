import parse from 'csv-parse';
import debug from 'debug';
import fs from 'fs';
import GeoTree from 'geo-tree';

const debugLog = debug('coffeecoffeecoffee:locations');

// Extending to add `cast` option; @types/csv-parse is outdated and doesn't support it
interface IOptionsWithCast extends parse.Options {
    /**
     * If true, the parser will attempt to convert input string to native types. If a function, receive the value as
     * first argument, a context as second argument and return a new value.
     */
    cast?: boolean;
}

type LocationMap = Map<number, ILocation>;

export interface ILocation {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

/**
 * Loads a CSV file from the given path and returns the promise of a LocationDatabase containing that file's data.
 * File format is assumed to be 5 columns: id (number), name (string), address (string), latitude (number),
 * longitude (number).
 * @param {string} path
 * @returns {Promise<locations.LocationDatabase>}
 */
export async function load(path: string) {
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

/**
 * In-memory data store for coffee shop locations.
 */
export class LocationDatabase {
    private locationMap: LocationMap = new Map<number, ILocation>();
    private tree: GeoTree = new GeoTree();

    /**
     * Creates a new, empty LocationDatabase.
     */
    // tslint:disable-next-line:no-empty
    constructor() {
    }

    public add(location: ILocation): void {
        this.locationMap.set(location.id, location);
        this.tree.insert({lat: location.lat, lng: location.lng, data: location.id});
    }

    public get(id: number): ILocation | undefined {
        return this.locationMap.get(id);
    }

    public get size(): number {
        return this.locationMap.size;
    }
}
