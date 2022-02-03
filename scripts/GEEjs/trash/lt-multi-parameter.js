
var ltgee = require('users/clarype/emapr:Development/LandTrendr_V2.5D.js');

var startID = 1;
var endID = 30;
var gFolderName = 'lt_parameter_selection_cambodia_samples_test_720000';

var points = ee.FeatureCollection("users/emaprlab/SERVIR/v1/clusterSNICseed_32nd_v1_5000_points_cluster_id_sample_ltparam")//.filter(ee.Filter.expression("cluster_id>="+startID.toString()+"&& cluster_id<="+endID.toString()))	
print(points.size())



var inputType = 'kml'; // 'table' or 'kml'
var description = 'samples'//startID.toString()+'-'+endID.toString();
var startYear = 1990// what year do you want to start the time series 
var endYear = 2019 // what year do you want to end the time series
var startDay = '11-15'; // what is the beginning of date filter | month-day
var endDay = '03-20'; // what is the end of date filter | month-day
var mosaicType = "medoid"; // how to make annual mosaic - options: "medoid", "targetDay" 
var targetDay = null ; // if running "targetDay" mosaic, what day of year should be the target
//var crs = "EPSG:4326" // hard coded project for CONUS
var latlng;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// ////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
var getPoint2 = function(img, geom, z) {
  return img.reduceRegion({reducer: 'first', geometry: geom, scale: z })//.getInfo();
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////// ////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var index = 'NDVI'
var ftvList =['NDVI']

var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDay, endDay, points); // Peter here, I think this collects surface reflectance images 
var annualLTcollection = ltgee.buildLTcollection(annualSRcollection, index, ftvList); 

  
// This function returns a dictionary that will become the attributtes in a feature collection
var ltPointData = function(feat){

  var id = feat.get('id')
  


  var latlng = feat.geometry().coordinates();

  var maxSegments = feat.get('maxSegment')

  var spikeThreshold = feat.get('spikeThres')
  var vertexCountOvershoot = feat.get('vertexCoun')
  var preventOneYearRecovery = true//feat.get('preventOne')
  var recoveryThreshold = feat.get('recoveryTh')
  var pvalThreshold = feat.get('pvalThresh')
  var bestModelProportion = feat.get('bestModelP')
  var minObservationsNeeded = feat.get('minObserva')
  
  var varParams = { 
    timeSeries: annualLTcollection,
    maxSegments: maxSegments, 
    spikeThreshold: spikeThreshold,
    vertexCountOvershoot: vertexCountOvershoot,
    preventOneYearRecovery: preventOneYearRecovery,
    recoveryThreshold: recoveryThreshold,
    pvalThreshold: pvalThreshold,
    bestModelProportion: bestModelProportion,
    minObservationsNeeded: minObservationsNeeded
  };
  
  
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(varParams);


  //var lt = ltgee.runLT(startYear, endYear, startDay, endDay, feat.geometry(), index, [index], varParams)
  var getpin2 = getPoint2(lt,feat.geometry(),30);
  var year = getpin2.values().slice(0,1).getArray(0).slice(0,0,1).project([1]).toInt()
  var orig = getpin2.values().slice(0,1).getArray(0).slice(0,1,2).project([1]).multiply(-1).round().toInt();
  var fitted = getpin2.values().slice(0,1).getArray(0).slice(0,2,3).project([1]).multiply(-1).round().toInt();
  var RMSE = getpin2.values().slice(2)//.toFloat()
  var binaryVertYearTimeSeries = getpin2.values().slice(0,1).getArray(0).slice(0,3,4).project([1])
  var tsInfo = ee.Dictionary({'pointID': id,'index': index, 'params':varParams, 'latLng':latlng, 'year':year, 'orig':orig, 'fitted':fitted, 'RMSE': RMSE, 'vert': binaryVertYearTimeSeries})
  return tsInfo
  
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//var tsInfo = ltPointData(points.first())



var featureCollection = points.map(function(feat){
  var tsInfo = ltPointData(feat)
  return ee.Feature(null, tsInfo)
})



//export the FeatureCollection.
Export.table.toDrive({
  collection: featureCollection,
  description: description+"_NDVI_big",
  folder: gFolderName,
  fileFormat: 'CSV'
});


// Export an ee.FeatureCollection as an Earth Engine asset.
// Export.table.toAsset({
//   collection: featureCollection,
//   description:'evalAsset',
//   assetId: 'evalAssetId',
// });












