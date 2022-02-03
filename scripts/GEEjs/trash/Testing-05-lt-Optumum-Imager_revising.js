//######################################################################################################## 
//#                                                                                                    #\\
//#                             LANDTRENDR MULTI PARAMETER IMAGING                                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////

var ltgee = require('users/emaprlab/public:LT-data-download/LandTrendr_V2.5D.js'); 

//////////////////////////////////////////////////////////
////////////////////params//////////////////////////
////////////////////////// /////////////////////////////

var startYear = 1999; 
var endYear = 2020; 
var startDate = '11-20'; 
var endDate =   '03-10'; 
var maskThese = ['powermask','cloud', 'shadow']
var fitIndex = 'NBR'

///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////



///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

var lookUpList =  table.toList(5000)

var filter_nbr = ee.Filter.eq('index','NBR')
var filter_b5 = ee.Filter.eq('index','B5')
var filter_ndvi = ee.Filter.eq('index','NDVI')
var filter_tcg = ee.Filter.eq('index','TCG')
var filter_tcw = ee.Filter.eq('index','TCW')

var nbr_table = lookUpList.filter(filter_nbr)
var b5_table = lookUpList.filter(filter_b5)
var ndvi_table = lookUpList.filter(filter_ndvi)
var tcg_table = lookUpList.filter(filter_tcg)
var tcw_table = lookUpList.filter(filter_tcw)


print(nbr_table)
///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

// landsat surface reflactance image collection
var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, maskThese);  

/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

//transformed Landsat surface reflectance image collection
var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', [fitIndex]); 
var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', [fitIndex]);
var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', [fitIndex]);
var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', [fitIndex]);
var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', [fitIndex]);


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
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
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
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

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
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
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
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

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
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
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
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


//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
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
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
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


//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
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
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
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

var printer = printerB5.cat(printerNBR).cat(printerNDVI).cat(printerTCG).cat(printerTCW)

print(printer)

//Mosaic each LandTrendr run in list to single image collection
var ltcol = ee.ImageCollection(printer).mosaic()

// get fitted data from LandTrendr
var fittied = ltgee.getFittedData(ltcol, startYear, endYear, fitIndex, [fitIndex],"ftv_").int()

// print(image.projection())
// print(ltcol.projection())
// print(fittied.projection())  
// print(annualSRcollection)
// print(annualLTcollectionTCG)

Map.addLayer(image,{min:0, max:5000},'cluster')
Map.addLayer(ltcol,{},'ltcol')
// Map.addLayer(fittied,{},'getFittedData')
// Map.addLayer(annualSRcollection,{},'annualSRcollection')
// Map.addLayer(annualLTcollectionTCG,{},'annualLTcollection')
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
Export.image.toAsset({
  image: fittied,
  description: 'Optimized_LandTrendr_image_powermask_'+fitIndex,
  assetId: 'Optimized_LandTrendr_image_powermask_'+fitIndex,
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


