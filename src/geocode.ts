import config from 'config';
import request from 'request-promise-native';

import { ICoordinates } from './locations';

const API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const geocodeRequest = request.defaults({
    json: true,
    qs: {
        key: config.get('geocode.key'),
    },
    uri: API_URL,
});

export enum GeocodeResponse { OK, ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR };

export class GeocodeError extends Error {
    public code: GeocodeResponse;

    constructor(code: GeocodeResponse) {
        super('Error geocoding address: ' + GeocodeResponse[code]);
        this.code = code;
        Object.setPrototypeOf(this, GeocodeError.prototype);
    }
}

/**
 * Geocodes a given address string to a promise of ICoordinates. Ignores multiple results and returns only the first.
 * @param {string} address
 * @returns {Promise<ICoordinates>}
 */
export default async function geocode(address: string): Promise<ICoordinates> {
    return new Promise<ICoordinates>((resolve, reject) => {
        geocodeRequest({ qs: { address } })
            .then((response) => {
                // shenanigans to coerce string to enum
                const status: GeocodeResponse = (GeocodeResponse as any)[response.status];
                if (status === GeocodeResponse.OK) {
                    resolve(response.results[0].geometry.location);  // response JSON already conforms to ICoordinates
                } else {
                    reject(new GeocodeError(status));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}
