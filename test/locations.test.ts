import Location from '../src/locations/location';
import LocationDatabase from '../src/locations/location-database';

describe('LocationDatabase', () => {
    test('create empty LocationDatabase', () => {
        let db = new LocationDatabase();
        expect(db).toBeDefined();
        expect(db.size).toBe(0);
    });

    test('load test LocationDatabase', async () => {
        let db = await LocationDatabase.load('./data/test.csv');
        expect(db).toBeDefined();
        expect(db.size).toBe(2);

        let location = db.get(1);
        expect(location).toBeDefined();
        expect(location).toMatchObject({id: 1});

        location = db.get(2);
        expect(location).toBeDefined();
        expect(location).toMatchObject({id: 2});
    });

    test('load nonexistent LocationDatabase', async () => {
        await expect(LocationDatabase.load('./data/blerrrrrg.csv')).rejects.toThrow();
    });

    describe('test LocationDatabase CRUD', () => {
        let db = new LocationDatabase();

        /* tslint:disable:object-literal-sort-keys
         * Shouldn't be a problem with the match-declaration-order config, but it's not working due to
         * https://github.com/palantir/tslint/issues/3586 */
        let location: Location = {
            id: 14,
            name: 'Wildcraft Espresso Bar',
            address: '2299 Market St',
            lat: 37.7641264665863,
            lng: -122.4330686990795,
        };
        /* tslint:enable:object-literal-sort-keys */

        test('create and read', () => {
            expect(db.get(location.id)).toBeUndefined();
            let size = db.size;

            db.add(location);
            expect(db.get(location.id)).toEqual(location);
            expect(db.size).toBe(size + 1);
        });

        test('update', () => {
            expect(db.get(location.id)).toEqual(location);
            let size = db.size;

            let newLocation = Object.assign({}, location);
            newLocation.name = 'Ritual Coffee Roasters';  // Wildcraft closed and was replaced by a Ritual
            db.update(newLocation);
            expect(db.get(location.id)).toEqual(newLocation);
            expect(db.size).toBe(size);
        });

        test('delete', () => {
            expect(db.get(location.id)).toBeDefined();
            let size = db.size;

            db.remove(location.id);
            expect(db.get(location.id)).toBeUndefined();
            expect(db.size).toBe(size - 1);
        });
    });
});
