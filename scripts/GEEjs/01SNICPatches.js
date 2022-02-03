

//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LANDTRENDR LIBRARY                                         #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu


// This Google Earth Program generates a SNIC (Simple non_iterative clustering) data set used in the LandTrendr Optimization process. The SINC dataset
// is made from three Landsat medoid composites; each composite is generated from  mulitpult image observations for a time 
// window in a year. The each image composites contain 6 bands (B1,B2,B3,B4,B5,and B7). The SNIC algorthim is then ran on the colmanation of the three 
// medoid composites. In this instance SNIC uses two parameters, size and compactness, which dictakes the size and shape of each cluster. The out 
// of thie program is a seed image, a seed is the starting point pixel for each cluster, containing a equic  

//////////////////Import Modules ////////////////////////////
var ltgee = require('users/emaprlab/public:LT-data-download/LandTrendr.js'); 

/////////////////////Cambodia vector////////////////////////////
var table = ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon");

//Centers the map on spatial features 
var aoi = table.geometry().buffer(5000);
Map.centerObject(aoi)
Map.addLayer(aoi)

////////////////////params//////////////////////////
var startYear = 1999; 
var endYear = 2020; 
var startDate = '06-20'; 
var endDate =   '09-10'; 
var masked = ['cloud', 'shadow', 'snow'] // Image masking options ie cloud option tries to remove clouds from the imagery. powermask in new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL
var folder = "LTOP_Oregon_SNIC_v1" 
var description = "LTOP_Oregon_SNIC_v1"

////////////////////////Landsat Composites///////////////////////////////
var getCombinedSRcollection20 = ltgee.getCombinedSRcollection(2020, startDate, endDate, aoi, masked);
var getCombinedSRcollection10 = ltgee.getCombinedSRcollection(2010, startDate, endDate, aoi, masked);
var getCombinedSRcollection00 = ltgee.getCombinedSRcollection(2000, startDate, endDate, aoi, masked);

// dummyCollection for fill nodata observations
var dummyCollection = ee.ImageCollection([ee.Image([0,0,0,0,0,0]).mask(ee.Image(0))]);

// make a medoid composite with equal weight among indices
var medoidMosaic = function(inCollection, dummyCollection) {
  
  // fill in missing years with the dummy collection
  var imageCount = inCollection.toList(1).length();                                                            // get the number of images 
  var finalCollection = ee.ImageCollection(ee.Algorithms.If(imageCount.gt(0), inCollection, dummyCollection)); // if the number of images in this year is 0, then use the dummy collection, otherwise use the SR collection
  
  // calculate median across images in collection per band
  var median = finalCollection.median();                                                                       // calculate the median of the annual image collection - returns a single 6 band image - the collection median per band
  
  // calculate the different between the median and the observation per image per band
  var difFromMedian = finalCollection.map(function(img) {
    var diff = ee.Image(img).subtract(median).pow(ee.Image.constant(2));                                       // get the difference between each image/band and the corresponding band median and take to power of 2 to make negatives positive and make greater differences weight more
    return diff.reduce('sum').addBands(img);                                                                   // per image in collection, sum the powered difference across the bands - set this as the first band add the SR bands to it - now a 7 band image collection
  });
  
  // get the medoid by selecting the image pixel with the smallest difference between median and observation per band 
  return ee.ImageCollection(difFromMedian).reduce(ee.Reducer.min(7)).select([1,2,3,4,5,6], ['B1','B2','B3','B4','B5','B7']); // find the powered difference that is the least - what image object is the closest to the median of teh collection - and then subset the SR bands and name them - leave behind the powered difference band
};

// calculate medoid composites from Sureface reflectance image collection
var medaic20 = medoidMosaic(getCombinedSRcollection20, dummyCollection)
var medaic10 = medoidMosaic(getCombinedSRcollection10, dummyCollection)
var medaic00 = medoidMosaic(getCombinedSRcollection00, dummyCollection)

// merge images together into stack
var LandsatComposites = medaic20.addBands(medaic10).addBands(medaic00)


////////////////////SNIC/////////////////////////////
var snicImagey = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
Map.addLayer(snicImagey,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47874114990233,"max":962.1856112670898,"gamma":1},'snicImagey')

//////////////SNIC split by bands////////////////////////
var patchRepsMean = snicImagey.select(["seeds","clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);
var patchRepSeeds = snicImagey.select(['seeds']);

///////Select singel pixel from each patch/////////////
var SNIC_means_image = patchRepSeeds.multiply(patchRepsMean)//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)

//Map.addLayer(SNIC_means_image,{"opacity":1,"bands":["B3_mean","B2_mean","B1_mean"],"min":242.47,"max":962.18,"gamma":1},'SNIC_means_image')

// //////////////Export SNIC/////////

//Export.image.toDrive({
//        image:snicImagey.toInt32().clip(aoi), 
//        description: description, 
//        folder:folder, 
//        fileNamePrefix: "snic_image_", 
//        region:aoi, 
//        scale:30, 
//        maxPixels: 1e13 
//      })     
      
Export.image.toDrive({
        image:SNIC_means_image.toInt32().clip(aoi), 
        description: description, 
        folder:folder, 
        fileNamePrefix: "snic_seed_", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })   





