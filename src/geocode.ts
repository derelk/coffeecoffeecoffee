import request from 'request-promise-native';

import { ICoordinates } from './locations';

const API_KEY = '';
const API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const geocodeRequest = request.defaults({
    json: true,
    qs: {
        key: API_KEY,
    },
    uri: API_URL,
});

/**
 * Geocodes a given address string to a promise of ICoordinates. Ignores multiple results and returns only the first.
 * @param {string} address
 * @returns {Promise<ICoordinates>}
 */
export default async function geocode(address: string): Promise<ICoordinates> {
    return new Promise<ICoordinates>((resolve, reject) => {
        geocodeRequest({ qs: { address } })
            .then((response) => {
                if (response.status === 'OK') {
                    resolve(response.results[0].geometry.location);  // response JSON already conforms to ICoordinates
                } else {
                    reject(new Error('Error geocoding address: ' + response.status));
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}
