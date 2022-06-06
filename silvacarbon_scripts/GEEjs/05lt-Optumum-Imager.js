//######################################################################################################## 
//#                                                                                                    #\\
//#                             LANDTRENDR MULTI PARAMETER IMAGING                                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE
//updated to run for the country of Laos

//  This program takes three inputs: a cluster image, look up table and boundary aoi. The cluster image is 
//  used to select spatial regions on which to execute a specially selected LandTrendr parameter 
//  configuration. The look up table contains the cluster id , index and  LandTrendr parameter configuration
//  on which to operate. The boundary aoi is used to clip to the output raster stack. The general flow of 
//  the program consists of three main parts: The filtering of the lookup table by index, Applying special 
//  selected parameters to LandTrendr with spatial conditions, and the merger of various unique LandTrendr 
//  datasets. 
var place = 'Paraguay'
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
//Map.addLayer(aoi,{},'aoi')
var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990")
Map.addLayer(cluster_image,{},'cluster image')
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights");

// var ids = ee.FeatureCollection('users/ak_glaciers/LTOP_cambodia_kmeans_cluster_ids_1990_start_subsetted'); 

// var cluster_ids = ids.aggregate_array('cluster_id').sort(); 
// var new_cluster_ids = ee.List.sequence(0,(cluster_ids.length().subtract(1))); 

// cluster_image = cluster_image.remap(cluster_ids,new_cluster_ids); 

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js');

//////////////////////////////////////////////////////////
////////////////////params//////////////////////////
////////////////////////// /////////////////////////////

var startYear = 1990; 
var endYear = 2020; 
var startDate = '11-20'; 
var endDate =   '03-10'; 
var maskThese = ['cloud', 'shadow']
//var fitIndex = "B5"

///////////////////////////////////////////////////////////
////////Filter parameter lookup table//////////////////////
///////////////////////////////////////////////////////////

// cast the feature collection (look up table) to list so we can filter and map it. Note that the number needs to be adjusted here 
//to the number of unique cluster ids in the kmeans output 
var lookUpList =  table.toList(220)

// filter look up table by spectral indice
// make filter - this could be made more generalized if we want to add more indices at some point? 
var filter_NBR = ee.Filter.eq('index','NBR')
var filter_B5 = ee.Filter.eq('index','B5')
var filter_NDVI = ee.Filter.eq('index','NDVI')
var filter_TCG = ee.Filter.eq('index','TCG')
var filter_TCW = ee.Filter.eq('index','TCW')

//apply filter
var NBR_table = lookUpList.filter(filter_NBR);
var B5_table = lookUpList.filter(filter_B5);
var NDVI_table = lookUpList.filter(filter_NDVI);
var TCG_table = lookUpList.filter(filter_TCG);
var TCW_table = lookUpList.filter(filter_TCW);

//print one list to see what it looks like 
print(TCG_table,'tcg'); 

///////////////////////////////////////////////////////////
/////////////Surface Image Collection//////////////////////
///////////////////////////////////////////////////////////

// landsat surface reflactance image collection
var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, maskThese);  

/////////////////////////////////////////////////////////
/////////////Transform Image Collection//////////////////
/////////////////////////////////////////////////////////

//transformed Landsat surface reflectance image collection - this likewise would need to be changed for more indices 
var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', ["NBR"]).select(["NBR","ftv_nbr"],["NBR","ftv_ltop"]); 
var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', ["NDVI"]).select(["NDVI","ftv_ndvi"],["NDVI","ftv_ltop"]); 
var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', ["TCW"]).select(["TCW","ftv_tcw"],["TCW","ftv_ltop"]); 
var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', ["TCG"]).select(["TCG","ftv_tcg"],["TCG","ftv_ltop"]); 
var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', ["B5"]).select(["B5","ftv_b5"],["B5","ftv_ltop"]); 
//print(annualLTcollectionNBR)

/////////////////////////////////////////////////////////
///////Apply Select Parameter to Clusters (B5)/////////// 
/////////////////////////////////////////////////////////
//write a new general function that takes the place of all the copied functions below - plan to map this over the lists above
//input args are the index tables above and the associated imageCollection
var printer_func = function(fc,ic){
  var output = fc.map(function(feat){
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
    
    // creates a mask keep pixels for only a single cluster - changed for something more simple
    var cluster_mask = cluster_image.eq(cluster_id).selfMask()
    
    // blank
    var maskcol;
  
    //maps over image collection applying the mask to each image
    maskcol = ic.map(function(img){
      var out = img.updateMask(cluster_mask).set('system:time_start', img.get('system:time_start'));
      return out
    })
    
    // apply masked image collection to LandTrendr parameter dictionary
    runParamstemp.timeSeries = maskcol;
    
    //Runs LandTrendr
    var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
    
    // return LandTrendr image collection run to list.
    return lt

}); 
  //this might be a little redundant but its a way to deal with the map statements 
  return output; 
}; 

//now call the function for each index we're interested in 
var printerB5 = printer_func(B5_table, annualLTcollectionB5); 
var printerNBR = printer_func(NBR_table, annualLTcollectionNBR); 
var printerNDVI = printer_func(NDVI_table, annualLTcollectionNDVI); 
var printerTCG = printer_func(TCG_table, annualLTcollectionTCG);
var printerTCW = printer_func(TCW_table, annualLTcollectionTCW);

// concat each index print output together
var combined_lt = printerB5.cat(printerNBR).cat(printerNDVI).cat(printerTCG).cat(printerTCW); 

//Mosaic each LandTrendr run in list to single image collection
var ltcol = ee.ImageCollection(combined_lt).mosaic(); 


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

var lt_vert = ltgee.getLTvertStack(ltcol, params).select([0,1,2,3,4,5,6,7,8,9,10]).int16(); 

// get fitted data from LandTrendr
//var fittied = ltgee.getFittedData(ltcol, startYear, endYear, fitIndex, [fitIndex],"ftv_").int()

// print(image.projection())
// print(ltcol.projection())
// print(fittied.projection())  
// print(annualSRcollection)
// print(annualLTcollectionTCG)

// Map.addLayer(cluster_image,{min:0, max:5000},'cluster')
// Map.addLayer(ltcol,{},'ltcol')
// Map.addLayer(lt_vert,{},'lt_vert')
// Map.addLayer(fittied,{},'getFittedData')
// Map.addLayer(annualSRcollection,{},'annualSRcollection')
// Map.addLayer(annualLTcollectionTCG,{},'annualLTcollection')
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
///////////////////////////////////////////////////////// 
Export.image.toAsset({
  image: lt_vert,
  description: 'Optimized_LT_1990_start_'+place+'_variable_kmeans_ids',
  assetId: 'Optimized_LT_1990_start_'+place+'_variable_kmeans_ids',
  region: aoi,
  scale: 30,
  maxPixels: 1e13
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


