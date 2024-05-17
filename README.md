# Company backend code challenge

## To test the program 

1. Pull the repo and install the node modules
2. In a shell, type `npm run api` from the main directory to start the server 
3. In a separate shell, type `npm run start` from the main directory to run the test script 

## The Challenge

The script `index.js` uses a local api to perform various operations on a set of cities. The task is to implement an api so that the script runs successfully all the way to the end.

Run `npm install` and `npm run start` to start the script.

The api loads the required data from ./addresses.json.

In the distance calculations it is assumed that the earth is a perfect sphere and has a radius is 6371 km.

NB: The .env file is included as it does not contain sensitive information and allows the user to run the program without
first creating a .env file and adding the access token secret. 
