# Data Generator for Parse

Initially made for Good Deeds (a startup started by @stremblayiOS at Quebec City Startup Weekeend 2014), this project aims to be a general dummy data generator for Parse.com API (backend as a service).

## Setup

* Create a project on Parse.com
* Clone the project : `git clone git@github.com:yanicklandry/good-deed-generator.git`
* Set local config file : `cp config.sample.js config.js`
* Copy into config.js the Parse.com project keys from https://parse.com/apps/******/edit#keys (replace ****** with your project url)
* `npm install`
* `npm start`

## Usage

* Open web broswer : `open http://localhost:3000/`
* For each resource configured, the *JSON* link generates a JSON file with random data
* The *API* link pushes the same random data directly into the Parse.com project

## Test

No testing is yet implemented.
