import config from 'config';

import LocationDatabase, { ILocation, INewLocation } from '../src/locations';

describe('LocationDatabase creation', () => {
    test('create empty LocationDatabase', () => {
        let db = new LocationDatabase();
        expect(db).toBeDefined();
        expect(db.size).toBe(0);
    });

    test('load test LocationDatabase', async () => {
        let db = await LocationDatabase.load(config.get('app.database'));
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
});

describe('LocationDatabase CRUD', () => {
    const db = new LocationDatabase();

    /* tslint:disable:object-literal-sort-keys
     * Shouldn't be a problem with the match-declaration-order config, but it's not working due to
     * https://github.com/palantir/tslint/issues/3586 */
    const newLocation: INewLocation = {
        name: 'Wildcraft Espresso Bar',
        address: '2299 Market St',
        lat: 37.7641264665863,
        lng: -122.4330686990795,
    };
    /* tslint:enable:object-literal-sort-keys */

    const addedLocation = newLocation as ILocation;
    addedLocation.id = 1;  // first location, so ID will be 1

    test('create and read', () => {
        expect(db.get(addedLocation.id)).toBeUndefined();
        let size = db.size;

        expect(db.add(newLocation)).toMatchObject(addedLocation);
        expect(db.get(addedLocation.id)).toMatchObject(addedLocation);
        expect(db.get(addedLocation.id)).not.toHaveProperty('treeLocationID');
        expect(db.size).toBe(size + 1);
    });

    test('update', () => {
        expect(db.get(addedLocation.id)).toMatchObject(addedLocation);
        let size = db.size;

        let updatedLocation = Object.assign({}, addedLocation);
        updatedLocation.name = 'Ritual Coffee Roasters';  // Wildcraft closed and was replaced by a Ritual
        db.update(updatedLocation);
        expect(db.get(addedLocation.id)).toMatchObject(updatedLocation);
        expect(db.size).toBe(size);
    });

    test('delete', () => {
        expect(db.get(addedLocation.id)).toBeDefined();
        let size = db.size;

        expect(db.remove(addedLocation.id)).toBe(true);
        expect(db.get(addedLocation.id)).toBeUndefined();
        expect(db.size).toBe(size - 1);
    });

    test('delete non-existent', () => {
        const id = 999;
        expect(db.get(id)).toBeUndefined();
        let size = db.size;

        expect(db.remove(id)).toBe(false);
        expect(db.get(id)).toBeUndefined();
        expect(db.size).toBe(size);
    });
});

describe('LocationDatabase findNearest()', () => {
    const loc1 = { lat: 37.760889, lng: -122.435020 };  // Castro & 18th
    const loc2 = { lat: 37.759325, lng: -122.434880 };  // Castro & 19th
    const loc3 = { lat: 37.881658, lng: -121.914146 };  // Mt. Diablo

    const philz = { id: 1, name: 'Philz Coffee', address: '549 Castro St' };
    const spikes = { id: 2, name: "Spike's Coffee and Teas", address: '4117 18th St' };
    /* tslint:disable-next-line:object-literal-sort-keys */
    const reveille: INewLocation = { name: 'Réveille Coffee Co.', address: '4076 18th St', lat: 37.76098725908006,
        lng: -122.43446774623341 };

    let db: LocationDatabase;
    beforeAll(async () => {
        db = await LocationDatabase.load('./data/test.csv');
    });

    test('find from test file', () => {
        expect(db.findNearest(loc1)).toMatchObject(philz);
        expect(db.findNearest(loc2)).toMatchObject(spikes);
    });

    test('find new location', () => {
        let added = db.add(reveille);
        expect(added).toMatchObject(reveille);
        expect(added.id).toBe(3);
        expect(db.findNearest(loc1)).toMatchObject(reveille);
    });

    test('find updated location', () => {
        const newName = "Spike's Coffee Only";
        let newSpikes = db.get(2);
        if (!newSpikes) {
            return fail();
        }
        newSpikes.name = newName;
        db.update(newSpikes);
        expect(db.findNearest(loc2)).toMatchObject({ id: 2, name: newName });
    });

    test('find after location moved', () => {
        let movedSpikes = db.get(2);
        if (!movedSpikes) {
            return fail();
        }
        movedSpikes.lat = 37.7647667;
        movedSpikes.lng = -122.4494884;
        db.update(movedSpikes);
        expect(db.findNearest(loc2)).toMatchObject(philz);
    });

    test('find after deleted location', () => {
        expect(db.findNearest(loc2)).toMatchObject(philz);
        expect(db.remove(1)).toBe(true);
        expect(db.findNearest(loc2)).toMatchObject(reveille);
    });

    test('find nothing', () => {
        expect(db.findNearest(loc3)).toBeUndefined();
    });

    test('find with radius', () => {
        expect(db.findNearest(loc3, 30)).toMatchObject(reveille);
    });
});
