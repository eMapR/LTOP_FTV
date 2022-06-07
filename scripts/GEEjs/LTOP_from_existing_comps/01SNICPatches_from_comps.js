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
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

//////////////////////////////////////////////////////////
///////////////////// vector////////////////////////////
////////////////////////// /////////////////////////////
var place = 'servir_basin'
//if you want to filter for a country
// var table = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Cambodia')); 
// var aoi = table.geometry().buffer(5000);

//use the full servir area
var aoi = ee.FeatureCollection("projects/servir-mekong/hydrafloods/CountryBasinsBuffer").geometry()

///////////////////////////////////////////////////////////////////
//////////////////// time and mask params//////////////////////////
////////////////////////// ////////////////////////////////////////

var startYear = 1990; 
var endYear = 2021; 

///////////////////////////////////////////////////////////////////
////////////////////////Landsat Composites/////////////////////////
///////////////////////////////////////////////////////////////////
//get the SERVIR composites
var yr_images = []; 
for (var y = 1990;y < 2022; y++){
  var im = ee.Image("projects/servir-mekong/composites/" + y.toString()); 
  yr_images.push(im); 
  
}

var servir_ic = ee.ImageCollection.fromImages(yr_images); 
print(servir_ic,'servir ic'); 
//in this version we don't build composites but pull them from existing composites
// var comps = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(aoi);

//the rest of the scripts will be easier if we just rename the bands of these composites to match what comes out of the LT modules
//note that if using the SERVIR composites the default will be to get the first six bands without the percentile bands
var comps = servir_ic.map(function(img){
  return img.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']);
}); 

//now make an image that looks like the outputs of the LT modules
var image2021 = comps.filter(ee.Filter.eq('system:index','2021')).first();
var image2005 = comps.filter(ee.Filter.eq('system:index','2005')).first();
var image1990 = comps.filter(ee.Filter.eq('system:index','1990')).first();

var LandsatComposites = image2021.addBands(image2005).addBands(image1990); 

////////////////////////////////////////////////////////
//////////////////SNIC//////////////////////////////////
////////////////////////////////////////////////////////

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
        description: place+'_SNIC_c2_comps', 
        folder:place+'_SNIC_c2_comps', 
        fileNamePrefix: place+"_SNIC_c2_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })     
      
Export.image.toDrive({
        image:SNIC_means_image.toInt32().clip(aoi), 
        description: place+'_SNICseed_c2_comps', 
        folder:place+'_SNIC_c2_comps', 
        fileNamePrefix: place+"_SNICseed_c2_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })   


