# GeoChart Component

## Overview

This project is the GeoChart Component (not to be confused with the [GeoView GeoChart Plugin](https://github.com/Canadian-Geospatial-Platform/geoview/tree/develop/packages/geoview-geochart)).

IMPORTANT: This component uses react-chart-js which also has a react dependency. For compatibility reasons:
  1) The [webpack.common.js](https://github.com/Canadian-Geospatial-Platform/geochart/blob/main/webpack.common.js#L22) file has property to exclude react and react-dom from the packages

     ![image](https://github.com/Canadian-Geospatial-Platform/geochart/assets/94073946/0559b31d-97bb-451c-bf8b-70c3a73991a5)

  2) cgpv-main.js in the [index.html](https://github.com/Canadian-Geospatial-Platform/geochart/blob/main/index.html#L16) file is referenced via the github url hostname (not the localhost, nor 127.0.0.1, nor an url tricked via the hosts file, etc) - any of those may result in react hook issues.

     ![image](https://github.com/Canadian-Geospatial-Platform/geochart/assets/94073946/9bbe481f-f51d-432c-a34a-f669dacaf87e)

[Demo](https://canadian-geospatial-platform.github.io/geochart/)

```html
The viewer is being loaded in public/index.html as a script tag

<script src="https://canadian-geospatial-platform.github.io/geoview/public/cgpv-main.js"></script>
```

## How it works

Developpers can import this project from their package.json directly and then import the [Chart component](https://github.com/Canadian-Geospatial-Platform/geochart/blob/main/src/chart.tsx).
There are 3 essential props for this component: inputs, data and options.
- **`inputs` is the main one and accepts an elaborate configuration json detailed below**;
- `data` is the equivalent of the ChartJS `data` props, to bypass the `inputs` and play with ChartJS directly;
- `options` is the equivalent of the ChartJS `options` props, to bypass the `inputs` props and play with ChartJS directly;

### Information on 'inputs' configuration
To read details on the schame of an `inputs` configuration json, see: [https://github.com/Canadian-Geospatial-Platform/geochart/blob/develop/schema-inputs.json](https://github.com/Canadian-Geospatial-Platform/geochart/blob/develop/schema-inputs.json)

### Example of an 'inputs` configuration:
```
{
  "chart": "line",
  "title": "Line Chart with time on x and sliders",
  "query": {
    "type": "esriRegular",
    "url": "https://maps-cartes.services.geo.ca/server_serveur/rest/services/HC/airborne_radioactivity_en/MapServer/3",
    "queryOptions": {
      "whereClauses": [
        {
          "field": "Location_Emplacement",
          "prefix": "'",
          "valueFrom": "Location_Emplacement",
          "suffix": "'"
        }
      ],
      "orderByField": "CollectionStart_DebutPrelevement"
    }
  },
  "geochart": {
    "borderWidth": 2,
    "xAxis": {
      "type": "time",
      "timeFormat": {
        "en": "MMM dd, yyyy, HH:mm",
        "fr": "d MMM yyyy, HH:mm"
      },
      "timeIANA": "America/Toronto",
      "ticksRule": "auto",
      "property": "CollectionStart_DebutPrelevement",
      "label": "Collected date"
    },
    "yAxis": {
      "type": "linear",
      "property": "Activity_Activite_mBqm3",
      "label": "Activity mBqm3",
      "tooltipSuffix": "mBqm3"
    }
  },
  "category": {
    "property": "Radionuclide_Radionucleide"
  },
  "ui": {
    "xSlider": {
      "display": true
    },
    "ySlider": {
      "display": true,
      "step": 0.1
    },
    "stepsSwitcher": true,
    "scalesSwitcher": true,
    "resetStates": true,
    "description": "This is a description text",
    "download": true
  },
  "datasources": [
    {
      "display": "Ottawa",
      "sourceItem": {
        "Location_Emplacement": "Ottawa"
      }
    },
    {
      "display": "Montreal",
      "sourceItem": {
        "Location_Emplacement": "Montreal"
      }
    },
    {
      "display": "Quebec",
      "sourceItem": {
        "Location_Emplacement": "Quebec"
      }
    }
  ]
}
```

## Running the project

### First clone this repo

```
$ git clone https://github.com/Canadian-Geospatial-Platform/geochart.git
```

### Go to the directory of the cloned repo

```
cd geochart
```

### Install dependencies

```
$ npm install
```

## Building the project

```
$ npm run build
```

### Run the project

```
$ npm run serve
```
