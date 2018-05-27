import debug from "debug";
import fs from "fs";
import parse from "csv-parse";

const debugLog = debug('coffeecoffeecoffee:locations');

export = locations;

// Extending to add `cast` option; @types/csv-parse is outdated and doesn't support it
interface OptionsWithCast extends parse.Options {
    /**
     * If true, the parser will attempt to convert input string to native types. If a function, receive the value as
     * first argument, a context as second argument and return a new value.
     */
    cast?: boolean;
}

type LocationMap = Map<number, locations.Location>;

namespace locations {
    export interface Location {
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

            // parses into objects conforming to Location interface (and trims whitespace)
            let parser = parse({
                'cast': true,
                'columns': ['id', 'name', 'address', 'lat', 'lng'],
                'trim': true
            } as OptionsWithCast);

            function onError(err: Error) {
                debugLog('Error on load');
                reject(err);
            }

            parser.on('error', onError);
            parser.on('readable', () => {
                let location: Location;
                while (location = parser.read()) {
                    debugLog(location);
                    locationDatabase.add(location.id, location);
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
        private locationMap: LocationMap;

        /**
         * Create a new LocationDatabase, optionally initialized with an existing LocationMap (Map<number, Location>).
         * @param {LocationMap} locationMap (optional; defaults to empty database)
         */
        constructor(locationMap?: LocationMap) {
            this.locationMap = locationMap ? locationMap : new Map<number, Location>();
        }

        add(id: number, location: Location) {
            this.locationMap.set(id, location);
        }

        get(id: number) {
            return this.locationMap.get(id);
        }

        get size(): number {
            return this.locationMap.size;
        }
    }
}
