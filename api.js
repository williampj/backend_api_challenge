const pump = require('pump');
const { promises, createReadStream } = require('fs');
const dotenv = require('dotenv');
const express = require("express");
const authenticator = require("./middleware/authenticator");

dotenv.config();
const app = express();
app.use(authenticator);
app.use(express.json());

const addressPath = "./addresses.json";
const port = 8080;
let addresses, addressesByGuid;
const areaResults = {};

// ============ Helper Functions ============

// Loads and parses JSON file
const getMapFromJSONFile = async (filePath, key) => {
    try {
        const data = await promises.readFile(filePath);
        const addresses = JSON.parse(data);
        const mappedAddresses = new Map();
        addresses.forEach(addr => mappedAddresses.set(addr[key], addr))

        return mappedAddresses;
    } catch (err) {
        console.error(err);
    }
} 

// Converts degrees to radians 
const degreesToRadiansConverter = (degrees) => degrees * Math.PI / 180.0;

// Calculates distance between two geolocations using the Haversine formula
const getDistanceBetweenAddresses = (fromGuid, toGuid) => {
    const { latitude: fromLat, longitude: fromLong } = addresses.get(fromGuid);
    const { latitude: toLat, longitude: toLong } = addresses.get(toGuid);
    const earthRadius = 6371;
    
    // Degrees converted to radians for use in Haversine equation
    const phiOne = degreesToRadiansConverter(fromLat);
    const phiTwo = degreesToRadiansConverter(toLat);
    const deltaPhi = degreesToRadiansConverter(toLat - fromLat);
    const deltaLambda = degreesToRadiansConverter(toLong - fromLong);

    const a = Math.pow(Math.sin(deltaPhi / 2.0), 2) +
                Math.cos(phiOne) * Math.cos(phiTwo) * Math.pow(Math.sin(deltaLambda / 2.0), 2);

    const c = 2 * Math.asin(Math.sqrt(a));

    return c * earthRadius;
}

// ============ API routes ============

// Returns list of cities that match a tag and isActive status from the query
app.get('/cities-by-tag', (req, res) => {
    try {
        let { tag, isActive } = req.query;
        isActive = isActive === 'true';
        
        const cities = [];
        for (const [_, address] of addresses) {
            if (address.isActive === isActive && address.tags.includes(tag)) {
                cities.push(address);
            }
        }

        res.status(200).send({ cities });
    } catch (err) {
        console.error(err);
    }
})

// calculates and returns the distance in kilometers between two geolocations
app.get('/distance', (req, res) => {
    try {
        const { from, to } = req.query;
        const distance = Math.round(getDistanceBetweenAddresses(from, to) * 1000) / 1000; // km with scale of 3 
    
        res.status(200).send({
            from: addresses.get(from), 
            to: addresses.get(to),  
            distance, 
            unit: 'km'
        });
    } catch (err) {
        console.error(err);
    }
})

// Generates a result of cities within a given distance from an address 
// Returns a 202 response code and a link to retrieve the results, then computes the results 
app.get('/area', (req, res) => {
    try {
        const { from, distance: targetDistance } = req.query;
        const { headers: { host }, protocol } = req;
        
        if (!addresses.get(from)) return res.status(404).send('Resource not found');
        
        const generatedString = '2152f96f-50c7-4d76-9e18-f7033bd14428'; // Hardcoded for testing purposes
        const resultsUrl = protocol + '://' + host + '/area-result/' + generatedString;
        areaResults[generatedString] = { completed: false };
        
        Promise.resolve(res.status(202).send({ resultsUrl }))
            .then(() => {
                const cities = [];
                for (const [dest, address] of addresses) {
                    if (from === dest) continue; // avoids calculating distance to self
                    
                    const dist = getDistanceBetweenAddresses(from, dest);    
                    if (dist <= targetDistance) {
                        cities.push(address);
                    } 
                };
                areaResults[generatedString].cities = cities;
                areaResults[generatedString].completed = true; 
            })
    } catch (err) {
        console.error(err);
    }
})

// Retrieves the results computed in the "/area" route
app.get('/area-result/*', (req, res) => {
    try {
        const key = req.params[0];
        
        if (!areaResults[key]) {
            res.status(404).send("Resource not found");
        } 
    
        const { completed } = areaResults[key];
        if (!completed) {
            res.status(202).send({});
        }
        else {
            const { cities } = areaResults[key];
            res.status(200).send({ cities });
        }
    } catch (err) {
        console.error(err);
    }
})

// Streams all cities in the addresses.json file to the client
app.get('/all-cities', (_, res) => {
    try {
        const readStream = createReadStream('./addresses.json');
        pump(readStream, res);

        readStream.on('error', () => {
            res.status(500).send('Server error');
        });
    } catch (err) {
        console.error(err);
    }
})

// Activates the server and loads address into memory
app.listen(port, async () => {
    addresses = await getMapFromJSONFile(addressPath, 'guid');
    console.log(`Listening on port ${port}`);
})