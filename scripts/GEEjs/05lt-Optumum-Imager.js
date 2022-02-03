//######################################################################################################## 
//#                                                                                                    #\\
//#                             LANDTRENDR MULTI PARAMETER IMAGING                                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE
//updated to run for the country of Laos

//  This program takes three inputs: a cluster image, look up table and boundary aoi. The cluster image is 
//  used to select spatial regions on which to execute a specially selected LandTrendr parameter 
//  configuration. The look up table contains the cluster id , index and  LandTrendr parameter configuration
//  on which to operate. The boundary aoi is used to clip to the output raster stack. The general flow of 
//  the program consists of three main parts: The filtering of the lookup table by index, Applying special 
//  selected parameters to LandTrendr with spatial conditions, and the merger of various unique LandTrendr 
//  datasets. 

//var aoi = ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);

var cluster_image = ee.Image("users/ak_glaciers/LTOP_Laos_Kmeans_Cluster_Image")

var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Laos_config_selected");

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////

var ltgee = require('users/emaprlab/broberts:LTOP_mekong/LandTrendr_V2.4.js'); 



//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js');

// var cluster_image = ee.Image("users/emaprlab/SERVIR/v1/clusterSNICimage_32nd_v1_5000_clipped"),
//     table = ee.FeatureCollection("users/emaprlab/SERVIR/v1/Mass_gee_LTop_param_selection_base_07_selected_v3"),
//     aoi = ee.FeatureCollection("users/emaprlab/SERVIR/v1/Cambodia");

//////////////////////////////////////////////////////////
////////////////////params//////////////////////////
////////////////////////// /////////////////////////////

var startYear = 1999; 
var endYear = 2020; 
var startDate = '11-20'; 
var endDate =   '03-10'; 
var maskThese = ['cloud', 'shadow']
//var fitIndex = "B5"

///////////////////////////////////////////////////////////
////////Filter parameter lookup table//////////////////////
///////////////////////////////////////////////////////////

// cast the feature collection (look up table) to list so we can filter and map it. 5000 for 5000 features in the collection
var lookUpList =  table.toList(5000)

// filter look up table by spectral indice
// make filter
var filter_nbr = ee.Filter.eq('index','NBR')
var filter_b5 = ee.Filter.eq('index','B5')
var filter_ndvi = ee.Filter.eq('index','NDVI')
var filter_tcg = ee.Filter.eq('index','TCG')
var filter_tcw = ee.Filter.eq('index','TCW')

//apply filter
var nbr_table = lookUpList.filter(filter_nbr)
var b5_table = lookUpList.filter(filter_b5)
var ndvi_table = lookUpList.filter(filter_ndvi)
var tcg_table = lookUpList.filter(filter_tcg)
var tcw_table = lookUpList.filter(filter_tcw)

print(nbr_table) // nbr look up list
///////////////////////////////////////////////////////////
/////////////Surface Image Collection//////////////////////
///////////////////////////////////////////////////////////

// landsat surface reflactance image collection
var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, maskThese);  

/////////////////////////////////////////////////////////
/////////////Transform Image Collection//////////////////
/////////////////////////////////////////////////////////

//transformed Landsat surface reflectance image collection
var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', ["NBR"]).select(["NBR","ftv_nbr"],["NBR","ftv_ltop"]); 
var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', ["NDVI"]).select(["NDVI","ftv_ndvi"],["NDVI","ftv_ltop"]); 
var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', ["TCW"]).select(["TCW","ftv_tcw"],["TCW","ftv_ltop"]); 
var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', ["TCG"]).select(["TCG","ftv_tcg"],["TCG","ftv_ltop"]); 
var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', ["B5"]).select(["B5","ftv_b5"],["B5","ftv_ltop"]); 
print(annualLTcollectionNBR)

/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (B5)/////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
// For each feature in the map iteration the select parameters are asigned to temp variables which are then
// to the landtrendr parameter dictionary. Then a mask is made for the from the cluster image where only cluster
// matching the cluster id are accessable to Landtrendr. Lastly Landtrendr is ran on the access pixels.
var printerB5 = b5_table.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = cluster_image.updateMask(cluster_image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;

  //maps over image collection appling the mask to each image
  maskcol = annualLTcollectionB5.map(function(img){
    var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
    return out
  })
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;
  
  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})

/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (NBR)/////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
// For each feature in the map iteration the select parameters are asigned to temp variables which are then
// to the landtrendr parameter dictionary. Then a mask is made for the from the cluster image where only cluster
// matching the cluster id are accessable to Landtrendr. Lastly Landtrendr is ran on the access pixels.
var printerNBR = nbr_table.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = cluster_image.updateMask(cluster_image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;

  //maps over image collection appling the mask to each image
  maskcol = annualLTcollectionNBR.map(function(img){
    var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
    return out
  })
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;
  
  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})

/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (NDVI)/////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
// For each feature in the map iteration the select parameters are asigned to temp variables which are then
// to the landtrendr parameter dictionary. Then a mask is made for the from the cluster image where only cluster
// matching the cluster id are accessable to Landtrendr. Lastly Landtrendr is ran on the access pixels.
var printerNDVI = ndvi_table.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = cluster_image.updateMask(cluster_image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;

  //maps over image collection appling the mask to each image
  maskcol = annualLTcollectionNDVI.map(function(img){
    var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
    return out
  })
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;
  
  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})


/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (TCG)/////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
// For each feature in the map iteration the select parameters are asigned to temp variables which are then
// to the landtrendr parameter dictionary. Then a mask is made for the from the cluster image where only cluster
// matching the cluster id are accessable to Landtrendr. Lastly Landtrendr is ran on the access pixels.
var printerTCG = tcg_table.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = cluster_image.updateMask(cluster_image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;

  //maps over image collection appling the mask to each image
  maskcol = annualLTcollectionTCG.map(function(img){
    var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
    return out
  })
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;
  
  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})


/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (TCW)/////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
// For each feature in the map iteration the select parameters are asigned to temp variables which are then
// to the landtrendr parameter dictionary. Then a mask is made for the from the cluster image where only cluster
// matching the cluster id are accessable to Landtrendr. Lastly Landtrendr is ran on the access pixels.
var printerTCW = tcw_table.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = cluster_image.updateMask(cluster_image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;

  //maps over image collection appling the mask to each image
  maskcol = annualLTcollectionTCW.map(function(img){
    var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
    return out
  })
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;

  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})


print(printerTCW)

// concat each indice print output together
var printer = printerB5.cat(printerNBR).cat(printerNDVI).cat(printerTCG).cat(printerTCW)

print(printer)

//Mosaic each LandTrendr run in list to single image collection
var ltcol = ee.ImageCollection(printer).mosaic()


var params = { 
  timeSeries: ee.ImageCollection([]),
  maxSegments: 10,
  spikeThreshold: 5,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 5,
  pvalThreshold: 5,
  bestModelProportion: 0.75,
  minObservationsNeeded: 5
};

var lt_vert = ltgee.getLTvertStack(ltcol, params).select([0,1,2,3,4,5,6,7,8,9,10]).int16()

// get fitted data from LandTrendr
//var fittied = ltgee.getFittedData(ltcol, startYear, endYear, fitIndex, [fitIndex],"ftv_").int()

// print(image.projection())
// print(ltcol.projection())
// print(fittied.projection())  
// print(annualSRcollection)
// print(annualLTcollectionTCG)

Map.addLayer(cluster_image,{min:0, max:5000},'cluster')
Map.addLayer(ltcol,{},'ltcol')
Map.addLayer(lt_vert,{},'lt_vert')
// Map.addLayer(fittied,{},'getFittedData')
// Map.addLayer(annualSRcollection,{},'annualSRcollection')
// Map.addLayer(annualLTcollectionTCG,{},'annualLTcollection')
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
Export.image.toAsset({
  image: lt_vert,
  description: 'Optimized_LandTrendr_year_vert_array',
  assetId: 'Optimized_LandTrendr_year_vert_array',
  region: aoi,
  scale: 30,
  maxPixels: 10000000000000
})  
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
// Export.image.toDrive({
//         image:fittied, 
//         description: 'Optimized_LandTrendr_image_powermask_v1_'+fitIndex, 
//         folder:'Optimized_LandTrendr_image_powermask_v1_'+fitIndex, 
//         fileNamePrefix: "Optimized_LandTrendr_image_powermask_v1_"+fitIndex, 
//         region:aoi, 
//         scale:30, 
//         crs:"EPSG:32648",
//         maxPixels: 1e13 
//       })  
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

