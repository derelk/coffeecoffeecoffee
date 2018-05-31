interface ILocation {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

export default class Location implements ILocation {
    public id: number;
    public name: string;
    public address: string;
    public lat: number;
    public lng: number;

    constructor(location: ILocation) {
        this.id = location.id;
        this.name = location.name;
        this.address = location.address;
        this.lat = location.lat;
        this.lng = location.lng;
    }
}
