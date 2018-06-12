# coffeecoffeecoffee
This is an example program designed to read in a list of coffee shop locations and provide a REST API to find the nearest coffee shop to a given location, as well as allow standard CRUD operations on the database. (Note: the database is held in-memory and modifications are not saved to disk.)

## Getting Started

### Installing
After cloning, run
```
npm install
```
to install all dependencies, including dev dependencies.

### Setup
#### Geocoding API Key
You'll need to provide an API key for Google's Geocoding API. Instructions may be found [here](https://developers.google.com/maps/documentation/geocoding/get-api-key). The key needs to go in a config file, either `config/default.json` or perhaps ideally in `config/local.json`, which Git will ignore. It can also be provided in the `NODE_CONFIG` env var, e.g.
```
$ NODE_CONFIG='{"geocode":{"key":"[API-KEY]"}}' npm start
``` 

#### Locations file
The application requires a CSV file of locations in a 5-column format: `id`, `name`, `address`, `latitude`, `longitude`

By default it will use the file `data/locations.csv`. You may provide a different file similarly to the API key: in a config file, or via `NODE_CONFIG='{"app":{"database":"[FILE-PATH]"}}'`.

### Building
To compile the TypeScript files to JavaScript before running:
```
npm run build
```

### Testing
To run all unit tests with coverage report:
```
npm run test
```
Note that tests still require a Geocoding API key per above.

### Running
To run the server:
```
npm start
```

If you want all debug output, run:
```
npm run debug
```

You can also limit debug output to specific modules:
```
DEBUG=coffeecoffeecoffee:server npm run serve
```

## API
Simple but fairly standard JSON-based REST API.

##### GET /locations/find
```
> GET /locations/find?address=2390+market+st+san+francisco HTTP/1.1

< HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
    "address": "2299 Market St",
    "id": 14,
    "lat": 37.7641264665863,
    "lng": -122.4330686990795,
    "name": "Wildcraft Espresso Bar"
}
```

##### POST /locations
```
> POST /locations HTTP/1.1
Content-Type: application/json

{
    "address": "398 Dolores St",
    "lat": "37.7631654",
    "lng": "-122.4265493",
    "name": "Maxfield's House of Caffeine"
}

< HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
    "address": "398 Dolores St",
    "id": 57,
    "lat": 37.7631654,
    "lng": -122.4265493,
    "name": "Maxfield's House of Caffeine"
}
```
##### GET /locations/[id]
```
> GET /locations/1 HTTP/1.1

< HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{
    "address": "986 Market St",
    "id": 1,
    "lat": 37.782394430549445,
    "lng": -122.40997343121123,
    "name": "Equator Coffees & Teas"
}
```

##### PATCH /locations/[id]
```
> PATCH /locations/14 HTTP/1.1
Content-Type: application/json

{
    "name": "Ritual Coffee Roasters"
}

< HTTP/1.1 200 OK

```

##### PUT /locations/[id]
```
> PUT /locations/14 HTTP/1.1
Content-Type: application/json

{
    "address": "2299 Market St",
    "lat": "37.7641264665863",
    "lng": "-122.4330686990795",
    "name": "Ritual Coffee Roasters"
}

< HTTP/1.1 200 OK
```

##### DELETE /locations/[id]
```
> DELETE /locations/41 HTTP/1.1

< HTTP/1.1 200 OK
```

## Design

### Data structure
I considered a number of data structures and libraries for this project to store geographic data in a way that allows for efficient search for nearest locations.

#### ❌ Array:
Iterating through an array of all locations and calculating the distance to each would obviously be easiest, and the O(n) search time would be fine in practice for this small of a data set. However, it's a poor (i.e. inefficient) general solution. Plus, it's no fun to pick the easy way.

#### ❌ k-d-tree:
k-d trees are for multidimensional space in the mathematical sense, and this library doesn't seem to account for the potentially vast difference between Euclidean distance and great-circle distance, the latter being necessary for this project. I didn't test it, but in looking at the code I don't think this library could behave correctly, e.g. further from the equator, bias towards longitudinal neighbors increases.

#### ❌ geotrie:
geotrie has the same problem as k-d-tree: it's even more explicit in the code that this is operating on Euclidean distance. This library also looks very unused.

#### ✅ geo-tree:
geo-tree looks appropriately designed for this use case and explicitly uses Haversine for great-circle distance calculation. The search time via the backing red-black tree should be O(log n). The insert and remove times are also O(log n), which is worse than Array's—probably O(1), though I couldn't easily find a definitive source since ECMA doesn't specify and thus it varies by engine—but given the nature of the project, I expect the "real-world" usage patterns result in lookup being the most frequent and critical operation by far. This library has two limitations that significantly impact this project: `find()` provides no ordering in its results nor any way to limit to n-nearest, and you can't remove points. The former is fairly easy to work around using another geo distance library that uses Haversine, and the latter can be mitigated trivially in code. All around, this seems to be the best (only?) choice, plus it looks well-used and maintained. Ideally I would fork and extend the library to solve these problems, but it felt beyond the scope of this exercise.

### Postmortem
Working around the limitations of geo-tree was less trivial than I originally anticipated. The right choice for a long-term project would be to fork that library and add node removal, or use a persistent database that handles coordinates, e.g. GeoJSON in Mongo or PostGIS for PostgreSQL.