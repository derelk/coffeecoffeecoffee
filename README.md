# coffeecoffeecoffee
This is an example program designed to read in a list of coffee shop locations and provide a REST API to find the nearest coffee shop to a given location, as well as allow standard CRUD operations on the database. (Note: the database is held in-memory and modifications are not saved to disk.) The location file is a 5-column CSV: id, name, address, latitude, longitude

## Getting Started

### Installing
After cloning, run
```
npm install
```
to install all dependencies, including dev dependencies.

### Building
To compile the TypeScript files to JavaScript before running:
```
npm run build
```
Note: These instructions assume you've globally installed typescript by running:
```
npm -g install typescript
```
and have the `tsc` binary in your path. If that's not the case and you're unable to do so, you can run:
```
./node_modules/typescript/bin/tsc
```
to build instead.

### Running
```
npm start
```
to run the server.

If you want debug output, run:
```
npm run debug
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
