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

    export async function load(path: string) {
        debugLog("Start loading locations");
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
                debugLog("Finish loading locations");
                resolve(locationDatabase);
            });

            let stream = fs.createReadStream(path);
            stream.on('error', onError);
            stream.on('open', () => {
                stream.pipe(parser);
            });
        });
    }

    export class LocationDatabase {
        private locationMap: LocationMap;

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
