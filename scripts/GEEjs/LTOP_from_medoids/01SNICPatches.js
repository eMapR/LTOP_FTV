

//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LANDTRENDR LIBRARY                                         #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE


//  This program takes a raster stack of images and constellates pixels that are spectrally similar around a 
//  seed pixel. The rasters used are harmonized landsat images for a given date window in a year over a yearly 
//  time series.   

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
//try using the collection 1 data 
// var ltgee = require('users/emaprlab/public:Modules/LandTrendr_C1_DEPRECATED.js'); 

//////////////////////////////////////////////////////////
//////////////////// time and mask params//////////////////////////
////////////////////////// /////////////////////////////

var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow'] // Image masking options ie cloud option tries to remove clouds from the imagery. powermask in new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL
var start_year = '2000'
var place = 'Cambodia'

//////////////////////////////////////////////////////////
///////////////////// vector////////////////////////////
////////////////////////// /////////////////////////////

var table = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)); 

//Centers the map on spatial features 
var aoi = table.geometry().buffer(5000);
// Map.centerObject(aoi)
// Map.addLayer(aoi)

/////////////////////////////////////////////////////////////////////////
////////////////////////Landsat Composites///////////////////////////////
/////////////////////////////////////////////////////////////////////////

var image2020 = ltgee.buildSRcollection(2020, 2020, startDate, endDate, aoi, masked).mosaic()
var image2005 = ltgee.buildSRcollection(2005, 2005, startDate, endDate, aoi, masked).mosaic()
var image1990 = ltgee.buildSRcollection(1990, 1990, startDate, endDate, aoi, masked).mosaic()

var LandsatComposites = image2020.addBands(image2005).addBands(image1990)
// print(LandsatComposites)
//////////////////////////////////////////////////////////
////////////////////SNIC/////////////////////////////
///////////////////////////////////////////////////////

var snicImagery = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
// Map.addLayer(snicImagery,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47874114990233,"max":962.1856112670898,"gamma":1},'snicImagey1')

//////////////////////////////////////////////////////////
//////////////SNIC split by bands////////////////////////
///////////////////////////////////////////////////////

var patchRepsMean = snicImagery.select(["seeds","clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);

var patchRepSeeds = snicImagery.select(['seeds']);

///////////////////////////////////////////////////////
///////Select singel pixel from each patch/////////////
///////////////////////////////////////////////////////

var SNIC_means_image = patchRepSeeds.multiply(patchRepsMean)//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)

// Map.addLayer(SNIC_means_image,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47,"max":962.18,"gamma":1},'SNIC_means_image')

// //////////////////////////////////
// //////////////Export SNIC/////////
// //////////////////////////////////

Export.image.toDrive({
        image:snicImagery.toInt32().clip(aoi), 
        description: place+'_SNIC_c1_'+start_year, 
        folder:place+'_SNIC_c1_'+start_year, 
        fileNamePrefix: place+"_SNIC_c1_"+start_year, 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })     
      
Export.image.toDrive({
        image:SNIC_means_image.toInt32().clip(aoi), 
        description: place+'_SNICseed_c1_'+start_year, 
        folder:place+'_SNIC_c1_'+start_year, 
        fileNamePrefix: place+"_SNICseed_c1_"+start_year, 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      });    


