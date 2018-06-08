import geocode from '../src/geocode';

test('non-existent address', async () => {
    await expect(geocode('6151 Squeedlyspooch Lane')).rejects.toThrow('ZERO_RESULTS');
});

test('real-ish address', async () => {
    await expect(geocode('6151 Richmond St')).resolves.toEqual({lat: 37.5934799, lng: -84.4943636});
});
