import debug from "debug";
import fs from "fs";
import parse from "csv-parse";

const debugLog = debug('coffeecoffeecoffee:locations');

export = locations;

namespace locations {
    interface Location {
        id: string;
        name: string;
        address: string;
        lat: string;
        lng: string;
    }

    export async function load(path: string) {
        debugLog("Start loading locations");
        return new Promise<Location[]>((resolve, reject) => {
            let locationList = new Array<Location>();
            let parser = parse({
                'columns': ['id', 'name', 'address', 'lat', 'lng'],
                'trim': true
            });

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
