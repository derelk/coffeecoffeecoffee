import http from 'http';
import request from 'supertest';

import { app } from '../src/app';

let server: http.Server;

beforeAll(() => {
    return new Promise((resolve, reject) => {
        app
            .then((app) => {
                server = http.createServer(app);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    });
});

describe('locations CRUD 20x', () => {
    test('create (POST)', async () => {
        const wildcraft = {
            address: '2299 Market St',
            lat: 37.7641264665863,
            lng: -122.4330686990795,
            name: 'Wildcraft Espresso Bar',
        };
        let response = await request(server).post('/locations').send(wildcraft);
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject(wildcraft);
        expect(response.body.id).toBe(3);

        response = await request(server).get('/locations/3');
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(wildcraft);
        expect(response.body.id).toBe(3);
    });

    test('read (GET)', async () => {
        let response = await request(server).get('/locations/2');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            address: '4117 18th St',
            id: 2,
            lat: 37.759418,
            lng: -122.435263,
            name: "Spike's Coffee and Teas",
        });
    });

    test('update (PATCH)', async () => {
        const newName = 'Ritual Coffee Roasters';
        let response = await request(server).get('/locations/3');
        expect(response.status).toBe(200);
        let wildcraft = response.body;

        response = await request(server).patch('/locations/3').send({name: newName});
        expect(response.status).toBe(200);

        wildcraft.name = newName;
        response = await request(server).get('/locations/3');
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(wildcraft);
    });

    test('update (PUT)', async () => {
        let newSpikes = {
            address: '4117 18th St #100',
            lat: 37.760668,
            lng: -122.435479,
            name: "Spike's Coffee Only",
        };

        let response = await request(server).put('/locations/2').send(newSpikes);
        expect(response.status).toBe(200);

        response = await request(server).get('/locations/2');
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(newSpikes);
    });

    test('delete (DELETE)', async () => {
        let response = await request(server).get('/locations/1');
        expect(response.status).toBe(200);

        response = await request(server).delete('/locations/1');
        expect(response.status).toBe(200);

        response = await request(server).get('/locations/1');
        expect(response.status).toBe(404);
    });
});

describe('400', () => {
    test('POST /locations missing parameters', async () => {
        let response = await request(server).post('/locations').send({});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(4);

        response = await request(server).post('/locations').send({name: 'Coffeetown'});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(3);

        response = await request(server).post('/locations').send({
            address: '16 Coffee Place',
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(2);

        response = await request(server).post('/locations').send({
            address: '16 Coffee Place',
            lat: 37.22222,
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);

        response = await request(server).post('/locations').send({
            address: '16 Coffee Place',
            lng: -122.444444,
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
    });

    test('POST /locations bad parameters', async () => {
        let location = {
            address: '16 Coffee Place',
            lat: 37.22222,
            lng: -122.444444,
            name: '',
        };
        let response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        location.name = 'Coffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' +
            'eeeeetown';
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        location.name = 'Coffeetown';
        location.address = '';
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        location.address = '12347837757237 Reeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeally Looooooooooooooooooooooooooooo' +
            'ooooooong St';
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        location.address = '16 Coffee Place';
        location.lat = 90.1111111;
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        location.lat = -90.0001;
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        location.lat = 37.22222;
        location.lng = -181.010101;
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');

        location.lng = 180.10102;
        response = await request(server).post('/locations').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');
    });

    test('GET /locations bad ID', async () => {
        let response = await request(server).get('/locations/blerg');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
    });

    test('PATCH /locations bad parameters', async () => {
        let response1 = await request(server).get('/locations/2');
        expect(response1.status).toBe(200);
        let response = await request(server).patch('/locations/2').send({name: ''});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        response = await request(server).patch('/locations/2').send({
            name: 'Coffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeet' +
            'own',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        response = await request(server).patch('/locations/2').send({address: ''});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        response = await request(server).patch('/locations/2').send({
            address: '12347837757237 Reeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeally Looooooooooooooooooooooooooooooooooo' +
            'ong St',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        response = await request(server).patch('/locations/2').send({lat: 90.1111111});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        response = await request(server).patch('/locations/2').send({lat: -90.0001});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        response = await request(server).patch('/locations/2').send({lng: -181.010101});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');

        response = await request(server).patch('/locations/2').send({lng: 180.10102});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');
    });

    test('PUT /locations missing parameters', async () => {
        let response = await request(server).put('/locations/2').send({});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(4);

        response = await request(server).put('/locations/2').send({name: 'Coffeetown'});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(3);

        response = await request(server).put('/locations/2').send({
            address: '16 Coffee Place',
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(2);

        response = await request(server).put('/locations/2').send({
            address: '16 Coffee Place',
            lat: 37.22222,
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);

        response = await request(server).put('/locations/2').send({
            address: '16 Coffee Place',
            lng: -122.444444,
            name: 'Coffeetown',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
    });

    test('PUT /locations bad parameters', async () => {
        let location = {
            address: '16 Coffee Place',
            lat: 37.22222,
            lng: -122.444444,
            name: '',
        };
        let response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        location.name = 'Coffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' +
            'eeeeetown';
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('name');

        location.name = 'Coffeetown';
        location.address = '';
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        location.address = '12347837757237 Reeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeally Looooooooooooooooooooooooooooo' +
            'ooooooong St';
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('address');

        location.address = '16 Coffee Place';
        location.lat = 90.1111111;
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        location.lat = -90.0001;
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lat');

        location.lat = 37.22222;
        location.lng = -181.010101;
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');

        location.lng = 180.10102;
        response = await request(server).put('/locations/2').send(location);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].param).toBe('lng');
    });

    test('DELETE /locations bad ID', async () => {
        let response = await request(server).delete('/locations/blerg');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.length).toBe(1);
    });
});

describe('404', () => {
    test('GET /locations', async () => {
        let response = await request(server).get('/locations');
        expect(response.status).toBe(404);
    });

    test('GET non-existent location', async () => {
        let response = await request(server).get('/locations/999');
        expect(response.status).toBe(404);
    });

    test('PATCH non-existent location', async () => {
        let response = await request(server).patch('/locations/999').send({name: 'Coffeetown'});
        expect(response.status).toBe(404);
    });

    test('PUT non-existent location', async () => {
        let response = await request(server).put('/locations/999').send({
            address: '16 Coffee Place',
            lat: 37.22222,
            lng: -122.444444,
            name: 'Coffeetown',
        });
        expect(response.status).toBe(404);
    });

    test('DELETE non-existent location', async () => {
        let response = await request(server).delete('/locations/999');
        expect(response.status).toBe(404);
    });

    test('GET non-existent path', async () => {
        let response = await request(server).get('/location/1');
        expect(response.status).toBe(404);
    });
});
