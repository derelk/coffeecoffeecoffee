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

namespace locations {
    interface Location {
        id: number;
        name: string;
        address: string;
        lat: number;
        lng: number;
    }

    export async function load(path: string) {
        debugLog("Start loading locations");
        return new Promise<Location[]>((resolve, reject) => {
            let locationList = new Array<Location>();

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
                let record: Location;
                while (record = parser.read()) {
                    debugLog(record);
                    locationList.push(record);
                }
            });
            parser.on('end', () => {
                debugLog("Finish loading locations");
                resolve(locationList);
            });

            let stream = fs.createReadStream(path);
            stream.on('error', onError);
            stream.on('open', () => {
                stream.pipe(parser);
            });
        });
    }
}
