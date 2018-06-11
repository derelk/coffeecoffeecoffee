import geocode, { GeocodeError, GeocodeResponse } from '../src/geocode';

test('non-existent address', () => {
    geocode('6151 Squeedlyspooch Lane')
        .then(() => {
            fail('Should have thrown GeocodeError');
        })
        .catch((err) => {
            expect(err).toBeInstanceOf(GeocodeError);
            expect(err.code).toBe(GeocodeResponse.ZERO_RESULTS);
        });
});

test('real-ish address', async () => {
    await expect(geocode('6151 Richmond St, Miami, FL')).resolves.toEqual({
        lat: 25.6087737,
        lng: -80.49900339999999,
    });
});
