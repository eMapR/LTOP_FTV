

var aoi = ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);

var startYear = 1999;
var endYear = 2020;
var startDay = "06-20";
var endDay = "09-10";
var maskThese = ['water','snow','shadow'];
var exclude = {};
var index = "NBR" ;
var ftvList = ['TCB','TCG','TCW','NBR', 'B5'];


var runParams = { 
  maxSegments: 8,
  spikeThreshold: 0.9,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 0.75,
  pvalThreshold: 0.05,
  bestModelProportion: 0.50,
  minObservationsNeeded: 8
};

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDay, endDay, aoi, maskThese, exclude) ;

var annualLTcollection = ltgee.buildLTcollection(annualSRcollection,index,ftvList);

//var transformCol = ltgee.transformSRcollection(annualSRcollection, ftvList);

var lt = ltgee.runLT(startYear, endYear, startDay, endDay, aoi, index, ftvList, runParams, maskThese, exclude)

Map.addLayer(lt)

var getFittedData_NBR_NBR = ltgee.getFittedData(lt, startYear, endYear, "NBR", ftvList)
var getFittedData_NBR_TCB = ltgee.getFittedData(lt, startYear, endYear, "TCB", ftvList)
var getFittedData_NBR_TCG = ltgee.getFittedData(lt, startYear, endYear, "TCG", ftvList)
var getFittedData_NBR_TCW = ltgee.getFittedData(lt, startYear, endYear, "TCW", ftvList)
var getFittedData_NBR_B5 = ltgee.getFittedData(lt, startYear, endYear, "B5", ftvList)
// //good
// var makeRGBcomposite = ltgee.makeRGBcomposite(index, startYear, endYear, startDay, endDay, 2000, 2005, 2010, aoi,runParams, 2.5, maskThese, exclude)

// //good
// var visParams;
// var getFittedRGBcol = ltgee.getFittedRGBcol(lt, startYear, endYear, ftvList, visParams)

//Map.addLayer(getFittedRGBcol)
//print(getFittedRGBcol)

Export.image.toDrive({
  image:getFittedData_NBR_NBR,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_nbr',
  folder:'LandTrendr_Orig_Oregon_NBR_nbr',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toAsset({
  image:getFittedData_NBR_NBR,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_nbr',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toDrive({
  image:getFittedData_NBR_TCB,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcb',
  folder:'LandTrendr_Orig_Oregon_NBR_tcb',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toAsset({
  image:getFittedData_NBR_TCB,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcb',
  crs:'EPSG:5070',
  maxPixels:1e13
});
Export.image.toDrive({
  image:getFittedData_NBR_TCG,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcg',
  folder:'LandTrendr_Orig_Oregon_NBR_tcg',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toAsset({
  image:getFittedData_NBR_TCG,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcg',
  crs:'EPSG:5070',
  maxPixels:1e13
});
Export.image.toDrive({
  image:getFittedData_NBR_TCW,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcw',
  folder:'LandTrendr_Orig_Oregon_NBR_tcw',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toAsset({
  image:getFittedData_NBR_TCW,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_tcw',
  crs:'EPSG:5070',
  maxPixels:1e13
});
Export.image.toDrive({
  image:getFittedData_NBR_B5,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_B5',
  folder:'LandTrendr_Orig_Oregon_NBR_B5',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

Export.image.toAsset({
  image:getFittedData_NBR_B5,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr_B5',
  crs:'EPSG:5070',
  maxPixels:1e13
});


var runInfo = ee.Dictionary({
  'featureCollection': "TIGER/2018/States", 
  'featureID': "Oregon",
  'gDriveFolder': "LandTrendr_Orig_Oregon_NBR_NBR",
  'startYear': startYear,
  'endYear': endYear,
  'startDay': startDay,
  'endDay': endDay,
  'maskThese': maskThese,
  'runParams':runParams
});

var runInfo = ee.FeatureCollection(ee.Feature(null, runInfo));
Export.table.toDrive({
  collection: runInfo,
  description: 'LandTrendr_orig_oregon_nbr_tcbtcgtcwnbrb5_Info',
  folder: "LandTrendr_Orig_Oregon_NBR_NBR",
  fileNamePrefix: 'runInfo',
  fileFormat: 'GeoJSON'
});
