// Type definitions for geo-tree 1.0.7
// Project: https://github.com/salsita/geo-tree
// Definitions by: Derek Shockey <https://github.com/derelk>

export = GeoTree;

declare class GeoTree {
    constructor();

    insert(location: GeoTree.Location): void;
    insert(locations: GeoTree.Location[]): void;
    insert(lat: number, lng: number, data: any): void;

    find(coordinates: GeoTree.Coordinates, radius: number, units?: string): any[];
    find(minCoordinates: GeoTree.Coordinates, maxCoordinates: GeoTree.Coordinates): any[];
    find(coordinates: GeoTree.Coordinates): any[];
    find(): any[];
}

declare namespace GeoTree {
    export interface Coordinates {
        lat: number;
        lng: number;
    }

    export interface Location extends Coordinates {
        data: any;
    }
}
