//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LANDTRENDR LIBRARY                                         #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE


//  This program takes a raster stack of images and groups pixels that are spectrally similar around a 
//  seed pixel. The rasters used are harmonized landsat images for a given date window in a year over a yearly 
//  time series.   

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////
//note that this needs to be changed to the public version when that is available 
var ltgee = require('users/emaprlab/broberts:lt_collection_2/LandTrendr.js'); 

//////////////////////////////////////////////////////////
///////////////////// vector////////////////////////////
////////////////////////// /////////////////////////////

//var table = ee.FeatureCollection("users/emaprlab/SERVIR/v1/Cambodia");
var table = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')); 

//Centers the map on spatial features 
var aoi = table.geometry().buffer(5000);
// Map.centerObject(aoi)
Map.addLayer(aoi)

//////////////////////////////////////////////////////////
//////////////////// time and mask params//////////////////////////
////////////////////////// /////////////////////////////

var startYear = 1987; 
var endYear = 2020; 

/////////////////////////////////////////////////////////
////////////////////////Landsat Composites///////////////////////////////
/////////////////////////////////////////////////////////

//in this version we don't build composites but pull them from existing composites
var comps = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(aoi);

//the rest of the scripts will be easier if we just rename the bands of these composites to match what comes out of the LT modules
//note that if using the SERVIR composites the default will be to get the first six bands without the percentile bands
comps = comps.map(function(img){
  return img.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']);
}); 

//now make an image that looks like the outputs of the LT modules
var image2020 = comps.filter(ee.Filter.eq('system:index','2020')).first();
var image2003 = comps.filter(ee.Filter.eq('system:index','2003')).first();
var image1987 = comps.filter(ee.Filter.eq('system:index','1987')).first();

var LandsatComposites = image2020.addBands(image2003).addBands(image1987); 

////////////////////////////////////////////////////////
//////////////////SNIC//////////////////////////////////
////////////////////////////////////////////////////////

var snicImagery = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
Map.addLayer(snicImagery,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47874114990233,"max":962.1856112670898,"gamma":1},'snicImagey1')

//////////////////////////////////////////////////////////
//////////////SNIC split by bands////////////////////////
///////////////////////////////////////////////////////

var patchRepsMean = snicImagery.select(["seeds","clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);

var patchRepSeeds = snicImagery.select(['seeds']);

///////////////////////////////////////////////////////
///////Select singel pixel from each patch/////////////
///////////////////////////////////////////////////////

var SNIC_means_image = patchRepSeeds.multiply(patchRepsMean)//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)

Map.addLayer(SNIC_means_image,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47,"max":962.18,"gamma":1},'SNIC_means_image')

// //////////////////////////////////
// //////////////Export SNIC/////////
// //////////////////////////////////

Export.image.toDrive({
        image:snicImagey.toInt32().clip(aoi), 
        description: 'LaosSNIC_v2_comps', 
        folder:'LaosSNIC_v2_comps', 
        fileNamePrefix: "LaosSNIC_v2_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })     
      
Export.image.toDrive({
        image:SNIC_means_image.toInt32().clip(aoi), 
        description: 'LaosSNICseed_v2_comps', 
        folder:'LaosSNIC_v2_comps', 
        fileNamePrefix: "LaosSNICseed_v2_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })   


